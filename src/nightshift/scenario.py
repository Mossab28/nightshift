"""The demo incident: a silent schema change planted in a real graph.

Nightshift's pitch is not "we detect problems in a toy dataset" -- it is "an
incident happens in a realistic enterprise graph and the on-call agents work it
end to end". So the scenario module does what a careless upstream team does at
2am: it renames a column in a source table and tells absolutely nobody.

Concretely, `break_pipeline` rewrites the upstream dataset's schema so that one
column disappears and a new name takes its place. Every downstream
transformation that selects the old name is now broken, the revenue dashboard
reads zero, and the only trail is in the metadata -- which is exactly the trail
a lineage-aware agent can follow and a log-grepping human cannot.

`restore_pipeline` puts the original schema back, so the demo can be run any
number of times against the same DataHub instance.
"""

from __future__ import annotations

import copy
import json
import time
from dataclasses import dataclass

import datahub.metadata.schema_classes as models
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.ingestion.graph.client import DataHubGraph

#: The careless upstream engineer, as recorded in the audit trail.
UPSTREAM_ACTOR = "urn:li:corpuser:datahub"


@dataclass(frozen=True)
class PlantedIncident:
    """Everything the demo needs to know about the break it just caused."""

    upstream_urn: str
    old_column: str
    new_column: str
    victim_urn: str
    symptom: str

    def to_json(self) -> str:
        return json.dumps(self.__dict__, indent=2)


class ScenarioError(RuntimeError):
    pass


def _get_schema(graph: DataHubGraph, dataset_urn: str) -> models.SchemaMetadataClass:
    schema = graph.get_aspect(dataset_urn, models.SchemaMetadataClass)
    if schema is None:
        raise ScenarioError(f"No schema found on {dataset_urn}; is the datapack loaded?")
    return schema


def break_pipeline(
    graph: DataHubGraph,
    *,
    upstream_urn: str,
    old_column: str,
    new_column: str,
    victim_urn: str,
) -> PlantedIncident:
    """Rename `old_column` to `new_column` on the upstream dataset's schema.

    This is the silent break: the upstream schema changes, downstream SQL still
    selects the old name, and nobody is told.
    """
    schema = _get_schema(graph, upstream_urn)
    fields = list(schema.fields)
    target = next(
        (f for f in fields if f.fieldPath.split(".")[-1] == old_column), None
    )
    if target is None:
        raise ScenarioError(
            f"Column `{old_column}` not found on {upstream_urn}. "
            f"Available: {[f.fieldPath for f in fields]}"
        )

    renamed = copy.deepcopy(target)
    renamed.fieldPath = target.fieldPath.replace(old_column, new_column)
    renamed.description = (
        (target.description or "")
        + f"\n\n(renamed from `{old_column}` in an upstream refactor)"
    ).strip()

    new_schema = copy.deepcopy(schema)
    new_schema.fields = [renamed if f is target else f for f in fields]
    new_schema.version = (schema.version or 0) + 1
    now = int(time.time() * 1000)
    new_schema.lastModified = models.AuditStampClass(time=now, actor=UPSTREAM_ACTOR)

    graph.emit_mcp(MetadataChangeProposalWrapper(entityUrn=upstream_urn, aspect=new_schema))

    return PlantedIncident(
        upstream_urn=upstream_urn,
        old_column=old_column,
        new_column=new_column,
        victim_urn=victim_urn,
        symptom=(
            "The revenue dashboard is showing zero for last week. It was fine at "
            "yesterday's close; it broke overnight. Finance noticed before we did."
        ),
    )


def restore_pipeline(
    graph: DataHubGraph,
    *,
    upstream_urn: str,
    old_column: str,
    new_column: str,
) -> None:
    """Undo the rename so the demo can run again from a clean graph."""
    schema = _get_schema(graph, upstream_urn)
    changed = False
    fields = []
    for f in schema.fields:
        if f.fieldPath.split(".")[-1] == new_column:
            f = copy.deepcopy(f)
            f.fieldPath = f.fieldPath.replace(new_column, old_column)
            if f.description:
                f.description = f.description.split("\n\n(renamed from")[0]
            changed = True
        fields.append(f)
    if not changed:
        return
    new_schema = copy.deepcopy(schema)
    new_schema.fields = fields
    new_schema.version = (schema.version or 0) + 1
    graph.emit_mcp(MetadataChangeProposalWrapper(entityUrn=upstream_urn, aspect=new_schema))
