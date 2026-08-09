"""External assertions: the guardrail Nightshift leaves behind.

DataHub's own quality skill reserves assertions for the Cloud product. The OSS
metadata model, however, accepts assertions declared by an outside system
(`source: EXTERNAL`) plus timeseries run events, which is enough to make them
appear on a dataset's Validations tab. Nightshift writes one after every fix, so
the same silent break cannot happen twice without someone being told.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass

import datahub.metadata.schema_classes as models
from datahub.emitter.mce_builder import make_assertion_urn
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.ingestion.graph.client import DataHubGraph

NIGHTSHIFT_RUN_ID_PREFIX = "nightshift"


@dataclass(frozen=True)
class ColumnGuard:
    """A promise about one column, written back into the graph."""

    dataset_urn: str
    column: str
    description: str

    @property
    def assertion_id(self) -> str:
        digest = hashlib.sha1(
            f"nightshift::{self.dataset_urn}::{self.column}".encode()
        ).hexdigest()[:20]
        return f"nightshift-{digest}"

    @property
    def urn(self) -> str:
        return make_assertion_urn(self.assertion_id)


def _audit_stamp(actor: str) -> models.AuditStampClass:
    return models.AuditStampClass(time=int(time.time() * 1000), actor=actor)


class AssertionsAPI:
    """Writes EXTERNAL assertions and their run events into the graph."""

    def __init__(self, graph: DataHubGraph, actor: str = "urn:li:corpuser:nightshift") -> None:
        self._graph = graph
        self._actor = actor

    def declare_column_guard(self, guard: ColumnGuard) -> str:
        """Declare (or re-declare) a column-presence assertion in Validations.

        Scope is honest: the column must exist in the catalog schema. This does
        not evaluate row values (all-null / sum=0). Those belong in dbt tests.
        """
        info = models.AssertionInfoClass(
            type=models.AssertionTypeClass.DATASET,
            source=models.AssertionSourceClass(
                type=models.AssertionSourceTypeClass.EXTERNAL,
                created=_audit_stamp(self._actor),
            ),
            description=(
                f"[column presence] {guard.description}"
                if not guard.description.startswith("[column presence]")
                else guard.description
            ),
            lastUpdated=_audit_stamp(self._actor),
            datasetAssertion=models.DatasetAssertionInfoClass(
                dataset=guard.dataset_urn,
                scope=models.DatasetAssertionScopeClass.DATASET_COLUMN,
                operator=models.AssertionStdOperatorClass._NATIVE_,
                fields=[_field_urn(guard.dataset_urn, guard.column)],
                nativeType="nightshift_column_present",
                logic=(
                    f"column `{guard.column}` must exist on "
                    f"{guard.dataset_urn.split(',')[-2]} "
                    "(presence only; not a value-level check). Nightshift"
                ),
            ),
        )
        self._graph.emit_mcp(
            MetadataChangeProposalWrapper(entityUrn=guard.urn, aspect=info)
        )
        return guard.urn

    def record_result(
        self,
        guard: ColumnGuard,
        *,
        passed: bool,
        run_id: str | None = None,
        context: dict[str, str] | None = None,
    ) -> None:
        """Emit a run event so the assertion shows a real verdict in the UI."""
        now = int(time.time() * 1000)
        event = models.AssertionRunEventClass(
            timestampMillis=now,
            runId=run_id or f"{NIGHTSHIFT_RUN_ID_PREFIX}-{now}",
            asserteeUrn=guard.dataset_urn,
            assertionUrn=guard.urn,
            status=models.AssertionRunStatusClass.COMPLETE,
            result=models.AssertionResultClass(
                type=(
                    models.AssertionResultTypeClass.SUCCESS
                    if passed
                    else models.AssertionResultTypeClass.FAILURE
                ),
                nativeResults=context or {},
            ),
        )
        self._graph.emit_mcp(
            MetadataChangeProposalWrapper(entityUrn=guard.urn, aspect=event)
        )


def _field_urn(dataset_urn: str, column: str) -> str:
    return f"urn:li:schemaField:({dataset_urn},{column})"
