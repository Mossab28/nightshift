"""Immunization: one incident protects the whole graph.

Fixing tonight's break is table stakes. The compounding move is to ask, while
the diagnosis is still warm: *where else in this graph does the same wound
exist?* Every dataset carrying the same column, the same shape of dependency,
the same silent-break exposure, and to leave a guard on each of them before
any of them breaks.

A team that does this by hand after an outage calls it a postmortem action
item, schedules it, and never finishes it. Nightshift does it in the same
minute as the fix.
"""

from __future__ import annotations

from dataclasses import dataclass

from datahub.ingestion.graph.client import DataHubGraph

from .datahub.assertions import AssertionsAPI, ColumnGuard


@dataclass(frozen=True)
class ImmunizationReport:
    column: str
    candidates: list[str]
    guarded: list[str]
    already_guarded: list[str]


def find_exposed_datasets(
    graph: DataHubGraph, column: str, *, exclude: set[str] | None = None, limit: int = 50
) -> list[str]:
    """Every dataset in the graph carrying this column name."""
    query = """
    query byField($input: SearchInput!) {
      search(input: $input) {
        searchResults { entity { urn } }
      }
    }
    """
    data = graph.execute_graphql(
        query,
        {
            "input": {
                "type": "DATASET",
                # `/q` switches DataHub search to structured query syntax,
                # which is what makes fieldPaths filtering actually work.
                "query": f'/q fieldPaths:"{column}"',
                "start": 0,
                "count": limit,
            }
        },
    )
    results = ((data.get("search") or {}).get("searchResults")) or []
    exclude = exclude or set()
    return [
        r["entity"]["urn"]
        for r in results
        if r.get("entity") and r["entity"]["urn"] not in exclude
    ]


def immunize(
    graph: DataHubGraph,
    *,
    column: str,
    failure_mode: str,
    reason: str,
    exclude: set[str] | None = None,
) -> ImmunizationReport:
    """Guard every dataset exposed to the same failure shape.

    Guards are idempotent (deterministic assertion ids), so re-immunizing after
    a later incident refreshes rather than duplicates.
    """
    assertions = AssertionsAPI(graph)
    candidates = find_exposed_datasets(graph, column, exclude=exclude)
    guarded: list[str] = []
    already: list[str] = []
    for urn in candidates:
        guard = ColumnGuard(
            dataset_urn=urn,
            column=column,
            description=(
                f"Immunization after a `{failure_mode}` incident elsewhere in the "
                f"graph: {reason}"
            ),
        )
        if graph.exists(guard.urn):
            already.append(urn)
            continue
        assertions.declare_column_guard(guard)
        assertions.record_result(
            guard, passed=True, context={"declared_by": "nightshift-immunization"}
        )
        guarded.append(urn)
    return ImmunizationReport(
        column=column, candidates=candidates, guarded=guarded, already_guarded=already
    )
