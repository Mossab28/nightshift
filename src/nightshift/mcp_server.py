"""The Nightshift MCP server: memory and write-back tools for any agent.

The official DataHub MCP server is excellent at reading the graph. It cannot
open an incident, resolve one, leave an assertion behind, or remember anything
between runs -- those are exactly the moves an on-call agent needs.

This server adds them, and it is deliberately usable on its own: point any
MCP-capable agent at it alongside the DataHub server and that agent stops
forgetting.

    claude mcp add nightshift -- uvx --from nightshift nightshift-mcp
"""

from __future__ import annotations

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from .config import load_settings
from .datahub.assertions import AssertionsAPI, ColumnGuard
from .datahub.client import build_graph
from .datahub.incidents import IncidentsAPI, IncidentStage, IncidentState, IncidentType
from .memory import GraphMemory, Postmortem

mcp = FastMCP("nightshift")

_graph = None


def _services() -> tuple[GraphMemory, IncidentsAPI, AssertionsAPI]:
    global _graph
    if _graph is None:
        _graph = build_graph(load_settings())
    return GraphMemory(_graph), IncidentsAPI(_graph), AssertionsAPI(_graph)


@mcp.tool()
def recall_incident_memory(dataset_urn: str) -> str:
    """Read what previous nights concluded about this dataset.

    Call this FIRST, before walking any lineage. If a previous incident already
    explains today's symptom, you can skip the investigation entirely.
    """
    memory, _, _ = _services()
    postmortems = memory.recall(dataset_urn)
    if not postmortems:
        return json.dumps(
            {
                "dataset_urn": dataset_urn,
                "known_incidents": 0,
                "note": "No prior Nightshift memory on this asset. Investigate from lineage.",
            }
        )
    return json.dumps(
        {
            "dataset_urn": dataset_urn,
            "known_incidents": len(postmortems),
            "postmortems": [p.__dict__ for p in postmortems],
            "note": (
                "This asset has been broken before. Verify whether the remembered "
                "root cause explains today's symptom before investigating anew."
            ),
        },
        indent=2,
    )


@mcp.tool()
def recall_across_lineage(dataset_urns: list[str]) -> str:
    """Read Nightshift memory for several assets at once, e.g. a lineage path."""
    memory, _, _ = _services()
    found = memory.recall_across(dataset_urns)
    return json.dumps(
        {urn: [p.__dict__ for p in items] for urn, items in found.items()}, indent=2
    )


@mcp.tool()
def find_datasets_with_failure_mode(failure_mode: str) -> str:
    """Find every asset in the graph that already suffered a given failure mode.

    Failure modes are slugs such as `silent-schema-change` or `late-upstream`.
    """
    memory, _, _ = _services()
    urns = memory.datasets_with_failure_mode(failure_mode)
    return json.dumps({"failure_mode": failure_mode, "datasets": urns}, indent=2)


@mcp.tool()
def open_incident(
    dataset_urn: str,
    title: str,
    description: str,
    incident_type: str = "OPERATIONAL",
) -> str:
    """Open an incident on an asset in DataHub, so the break is visible to humans."""
    _, incidents, _ = _services()
    urn = incidents.raise_incident(
        resource_urn=dataset_urn,
        title=title,
        description=description,
        incident_type=IncidentType(incident_type),
    )
    return json.dumps({"incident_urn": urn, "state": "ACTIVE"})


@mcp.tool()
def resolve_incident(incident_urn: str, message: str) -> str:
    """Resolve an incident with a message explaining what was actually done."""
    _, incidents, _ = _services()
    ok = incidents.update_status(
        incident_urn=incident_urn,
        state=IncidentState.RESOLVED,
        stage=IncidentStage.FIXED,
        message=message,
    )
    return json.dumps({"incident_urn": incident_urn, "resolved": ok})


@mcp.tool()
def guard_column(dataset_urn: str, column: str, why: str) -> str:
    """Leave an assertion watching a column, so this break cannot recur silently.

    Call this after a fix. It is what turns one repaired incident into a
    permanent guarantee for everyone downstream.
    """
    _, _, assertions = _services()
    guard = ColumnGuard(dataset_urn=dataset_urn, column=column, description=why)
    urn = assertions.declare_column_guard(guard)
    assertions.record_result(guard, passed=True, context={"declared_by": "nightshift"})
    return json.dumps({"assertion_urn": urn, "dataset_urn": dataset_urn, "column": column})


@mcp.tool()
def remember_incident(
    dataset_urn: str,
    failure_mode: str,
    summary: str,
    root_cause: str,
    upstream_urn: str | None = None,
    changed_field: str | None = None,
    lineage_path: list[str] | None = None,
    fix_url: str | None = None,
    incident_urn: str | None = None,
    guard_urn: str | None = None,
    minutes_to_root_cause: float | None = None,
) -> str:
    """Write tonight's conclusion into the graph, for humans and for the next agent.

    This is the last thing you do on any incident, and it is not optional. Write
    a conclusion, never a status: the next night reads this instead of starting
    from nothing.
    """
    memory, _, _ = _services()
    memory.ensure_property()
    postmortem = Postmortem(
        dataset_urn=dataset_urn,
        failure_mode=failure_mode,
        summary=summary,
        root_cause=root_cause,
        upstream_urn=upstream_urn,
        changed_field=changed_field,
        lineage_path=lineage_path or [],
        fix_url=fix_url,
        incident_urn=incident_urn,
        guard_urn=guard_urn,
        minutes_to_root_cause=minutes_to_root_cause,
    )
    memory.remember(postmortem)
    return json.dumps(
        {
            "remembered": True,
            "dataset_urn": dataset_urn,
            "failure_mode": failure_mode,
            "written_to": [
                "documentation (human)",
                "structured property (machine)",
                "failure-mode tag (searchable)",
            ],
        }
    )


def main() -> Any:
    """Entry point for `nightshift-mcp`."""
    return mcp.run()


if __name__ == "__main__":
    main()
