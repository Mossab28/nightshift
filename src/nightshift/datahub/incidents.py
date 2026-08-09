"""Incidents, the part of DataHub OSS that no agent tool reaches yet.

The MCP server ships read tools and a handful of tag/description mutations, but
nothing for incidents: raising one, moving it through its stages, resolving it.
That gap is exactly where an on-call agent lives, so Nightshift implements it
against the GraphQL API and upstreams it as a skill.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from datahub.ingestion.graph.client import DataHubGraph


class IncidentType(str, Enum):
    """Mirrors DataHub's IncidentType enum."""

    OPERATIONAL = "OPERATIONAL"
    FRESHNESS = "FRESHNESS"
    VOLUME = "VOLUME"
    COLUMN = "COLUMN"
    SQL = "SQL"
    DATA_SCHEMA = "DATA_SCHEMA"
    CUSTOM = "CUSTOM"


class IncidentState(str, Enum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"


class IncidentStage(str, Enum):
    TRIAGE = "TRIAGE"
    INVESTIGATION = "INVESTIGATION"
    WORK_IN_PROGRESS = "WORK_IN_PROGRESS"
    FIXED = "FIXED"
    NO_ACTION_REQUIRED = "NO_ACTION_REQUIRED"


@dataclass(frozen=True)
class Incident:
    urn: str
    title: str
    description: str
    state: str
    stage: str | None
    resource_urn: str


_RAISE = """
mutation raiseIncident($input: RaiseIncidentInput!) {
  raiseIncident(input: $input)
}
"""

_UPDATE_STATUS = """
mutation updateIncidentStatus($urn: String!, $input: UpdateIncidentStatusInput!) {
  updateIncidentStatus(urn: $urn, input: $input)
}
"""

_LIST_FOR_DATASET = """
query datasetIncidents($urn: String!, $start: Int!, $count: Int!) {
  dataset(urn: $urn) {
    incidents(start: $start, count: $count) {
      total
      incidents {
        urn
        title
        description
        status { state stage message }
        entity { urn }
      }
    }
  }
}
"""


class IncidentsAPI:
    def __init__(self, graph: DataHubGraph) -> None:
        self._graph = graph

    def raise_incident(
        self,
        *,
        resource_urn: str,
        title: str,
        description: str,
        incident_type: IncidentType = IncidentType.OPERATIONAL,
        priority: int | None = None,
    ) -> str:
        """Open an incident on an entity and return its urn."""
        payload: dict[str, object] = {
            "type": incident_type.value,
            "title": title,
            "description": description,
            "resourceUrn": resource_urn,
        }
        if priority is not None:
            payload["priority"] = priority
        data = self._graph.execute_graphql(_RAISE, {"input": payload})
        return data["raiseIncident"]

    def update_status(
        self,
        *,
        incident_urn: str,
        state: IncidentState,
        stage: IncidentStage | None = None,
        message: str | None = None,
    ) -> bool:
        payload: dict[str, object] = {"state": state.value}
        if stage is not None:
            payload["stage"] = stage.value
        if message is not None:
            payload["message"] = message
        data = self._graph.execute_graphql(_UPDATE_STATUS, {"urn": incident_urn, "input": payload})
        return bool(data["updateIncidentStatus"])

    def for_dataset(self, dataset_urn: str, *, start: int = 0, count: int = 50) -> list[Incident]:
        data = self._graph.execute_graphql(
            _LIST_FOR_DATASET, {"urn": dataset_urn, "start": start, "count": count}
        )
        dataset = data.get("dataset") or {}
        block = dataset.get("incidents") or {}
        results: list[Incident] = []
        for raw in block.get("incidents") or []:
            status = raw.get("status") or {}
            entity = raw.get("entity") or {}
            results.append(
                Incident(
                    urn=raw["urn"],
                    title=raw.get("title") or "",
                    description=raw.get("description") or "",
                    state=status.get("state") or "",
                    stage=status.get("stage"),
                    resource_urn=entity.get("urn") or dataset_urn,
                )
            )
        return results
