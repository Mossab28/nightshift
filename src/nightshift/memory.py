"""The graph as institutional memory.

This module is the whole point of Nightshift.

Every other agent built on a catalog reads it. It answers a question, and then
it forgets. The next night, the same pipeline breaks the same way, and the same
investigation runs again from zero -- because the understanding lived in a chat
transcript that nobody can query.

Nightshift writes what it learned back into DataHub, in two registers at once:

* **for people** -- a postmortem in the dataset's documentation, and a link to
  the fix, so the next human who opens the asset sees the history without asking
  anyone;
* **for the next agent** -- a structured property holding the machine-readable
  record, and a tag naming the failure mode, both of which are *searchable*.

That second register is what makes the loop compound. On the next incident the
agent does not start by exploring lineage: it starts by asking the graph whether
this shape of failure has been seen before, on this dataset or anywhere
upstream. When the answer is yes, an investigation becomes a lookup.
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from typing import Any

import datahub.metadata.schema_classes as models
from datahub.emitter.mce_builder import make_tag_urn
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.ingestion.graph.client import DataHubGraph

NIGHTSHIFT_ACTOR = "urn:li:corpuser:nightshift"

#: Structured property carrying the machine-readable postmortem record.
MEMORY_PROPERTY_URN = "urn:li:structuredProperty:nightshift.incidentMemory"
MEMORY_PROPERTY_NAME = "nightshift.incidentMemory"

#: Tag prefix naming a failure mode, so `tags:nightshift.silent-schema-change`
#: is a search anyone -- human or agent -- can run across the whole graph.
FAILURE_MODE_TAG_PREFIX = "nightshift"


@dataclass
class Postmortem:
    """What one night of on-call work taught us about one dataset."""

    dataset_urn: str
    failure_mode: str
    summary: str
    root_cause: str
    upstream_urn: str | None = None
    changed_field: str | None = None
    lineage_path: list[str] = field(default_factory=list)
    fix_url: str | None = None
    incident_urn: str | None = None
    guard_urn: str | None = None
    minutes_to_root_cause: float | None = None
    recorded_at_ms: int = field(default_factory=lambda: int(time.time() * 1000))

    def to_json(self) -> str:
        return json.dumps(asdict(self), sort_keys=True)

    @classmethod
    def from_json(cls, raw: str) -> Postmortem:
        return cls(**json.loads(raw))

    def as_prose(self) -> str:
        """The human register: what a tired on-call engineer wants at 9am."""
        lines = [
            f"### Nightshift postmortem -- {self.summary}",
            "",
            f"**Failure mode:** `{self.failure_mode}`",
            f"**Root cause:** {self.root_cause}",
        ]
        if self.upstream_urn:
            lines.append(f"**Upstream at fault:** `{self.upstream_urn}`")
        if self.changed_field:
            lines.append(f"**Field involved:** `{self.changed_field}`")
        if self.lineage_path:
            lines.append("")
            lines.append("**Path taken through lineage:**")
            lines.extend(f"{i + 1}. `{urn}`" for i, urn in enumerate(self.lineage_path))
        if self.fix_url:
            lines.append("")
            lines.append(f"**Fix:** {self.fix_url}")
        if self.guard_urn:
            lines.append(
                f"**Guardrail left behind:** assertion `{self.guard_urn}` "
                "now watches this so the break cannot recur silently."
            )
        lines.append("")
        lines.append(
            "_Written by Nightshift. The next incident on this asset starts from "
            "this note instead of from nothing._"
        )
        return "\n".join(lines)


def _stamp() -> models.AuditStampClass:
    return models.AuditStampClass(time=int(time.time() * 1000), actor=NIGHTSHIFT_ACTOR)


def _attribution() -> models.MetadataAttributionClass:
    return models.MetadataAttributionClass(
        time=int(time.time() * 1000), actor=NIGHTSHIFT_ACTOR, source=NIGHTSHIFT_ACTOR
    )


def failure_mode_tag(failure_mode: str) -> str:
    return make_tag_urn(f"{FAILURE_MODE_TAG_PREFIX}.{failure_mode}")


class GraphMemory:
    """Read and write Nightshift's memory, which lives in DataHub itself."""

    def __init__(self, graph: DataHubGraph) -> None:
        self._graph = graph

    # ---------------------------------------------------------------- setup

    def ensure_property(self) -> None:
        """Define the structured property once; safe to call on every run."""
        definition = models.StructuredPropertyDefinitionClass(
            qualifiedName=MEMORY_PROPERTY_NAME,
            displayName="Nightshift incident memory",
            valueType="urn:li:dataType:datahub.string",
            entityTypes=["urn:li:entityType:datahub.dataset"],
            cardinality=models.PropertyCardinalityClass.MULTIPLE,
            description=(
                "Machine-readable postmortems written by the Nightshift on-call "
                "agents. One value per incident resolved on this asset."
            ),
            created=_stamp(),
            lastModified=_stamp(),
        )
        self._graph.emit_mcp(
            MetadataChangeProposalWrapper(entityUrn=MEMORY_PROPERTY_URN, aspect=definition)
        )

    # ---------------------------------------------------------------- write

    def remember(self, postmortem: Postmortem) -> None:
        """Persist one postmortem in every register at once."""
        self._append_documentation(postmortem)
        self._append_structured_memory(postmortem)
        self._tag_failure_mode(postmortem)
        if postmortem.fix_url:
            self._link_fix(postmortem)

    def _append_documentation(self, postmortem: Postmortem) -> None:
        existing = self._graph.get_aspect(postmortem.dataset_urn, models.DocumentationClass)
        entries = list(existing.documentations) if existing else []
        entries.append(
            models.DocumentationAssociationClass(
                documentation=postmortem.as_prose(), attribution=_attribution()
            )
        )
        self._graph.emit_mcp(
            MetadataChangeProposalWrapper(
                entityUrn=postmortem.dataset_urn,
                aspect=models.DocumentationClass(documentations=entries),
            )
        )

    def _append_structured_memory(self, postmortem: Postmortem) -> None:
        existing = self._graph.get_aspect(
            postmortem.dataset_urn, models.StructuredPropertiesClass
        )
        previous = list(existing.properties) if existing else []
        assignments = [a for a in previous if a.propertyUrn != MEMORY_PROPERTY_URN]
        values: list[str | float] = [
            v for a in previous if a.propertyUrn == MEMORY_PROPERTY_URN for v in a.values
        ]
        values.append(postmortem.to_json())
        assignments.append(
            models.StructuredPropertyValueAssignmentClass(
                propertyUrn=MEMORY_PROPERTY_URN,
                values=values,
                created=_stamp(),
                lastModified=_stamp(),
            )
        )
        self._graph.emit_mcp(
            MetadataChangeProposalWrapper(
                entityUrn=postmortem.dataset_urn,
                aspect=models.StructuredPropertiesClass(properties=assignments),
            )
        )

    def _tag_failure_mode(self, postmortem: Postmortem) -> None:
        tag_urn = failure_mode_tag(postmortem.failure_mode)
        existing = self._graph.get_aspect(postmortem.dataset_urn, models.GlobalTagsClass)
        tags = list(existing.tags) if existing else []
        if any(t.tag == tag_urn for t in tags):
            return
        tags.append(models.TagAssociationClass(tag=tag_urn, attribution=_attribution()))
        self._graph.emit_mcp(
            MetadataChangeProposalWrapper(
                entityUrn=postmortem.dataset_urn,
                aspect=models.GlobalTagsClass(tags=tags),
            )
        )

    def _link_fix(self, postmortem: Postmortem) -> None:
        existing = self._graph.get_aspect(
            postmortem.dataset_urn, models.InstitutionalMemoryClass
        )
        elements = list(existing.elements) if existing else []
        if any(e.url == postmortem.fix_url for e in elements):
            return
        elements.append(
            models.InstitutionalMemoryMetadataClass(
                url=postmortem.fix_url or "",
                description=f"Nightshift fix -- {postmortem.summary}",
                createStamp=_stamp(),
            )
        )
        self._graph.emit_mcp(
            MetadataChangeProposalWrapper(
                entityUrn=postmortem.dataset_urn,
                aspect=models.InstitutionalMemoryClass(elements=elements),
            )
        )

    # ----------------------------------------------------------------- read

    def recall(self, dataset_urn: str) -> list[Postmortem]:
        """Everything Nightshift has learned about this one asset."""
        aspect = self._graph.get_aspect(dataset_urn, models.StructuredPropertiesClass)
        if not aspect:
            return []
        out: list[Postmortem] = []
        for assignment in aspect.properties:
            if assignment.propertyUrn != MEMORY_PROPERTY_URN:
                continue
            for value in assignment.values:
                if isinstance(value, str):
                    try:
                        out.append(Postmortem.from_json(value))
                    except (ValueError, TypeError):
                        continue
        return sorted(out, key=lambda p: p.recorded_at_ms)

    def recall_across(self, dataset_urns: list[str]) -> dict[str, list[Postmortem]]:
        """Memory for a set of assets -- typically a lineage path."""
        found = ((urn, self.recall(urn)) for urn in dataset_urns)
        return {urn: memories for urn, memories in found if memories}

    def datasets_with_failure_mode(self, failure_mode: str, limit: int = 50) -> list[str]:
        """Every asset in the graph that has already suffered this failure."""
        tag_urn = failure_mode_tag(failure_mode)
        query = """
        query byTag($query: String!, $count: Int!) {
          search(input: {type: DATASET, query: $query, start: 0, count: $count}) {
            searchResults { entity { urn } }
          }
        }
        """
        data: dict[str, Any] = self._graph.execute_graphql(
            query, {"query": f'tags:"{tag_urn}"', "count": limit}
        )
        results = ((data.get("search") or {}).get("searchResults")) or []
        return [r["entity"]["urn"] for r in results if r.get("entity")]
