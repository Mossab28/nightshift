"""One client for the whole graph.

DataHub's Python `DataHubGraph` already carries everything Nightshift needs:
typed aspect reads, MCP emission, and raw GraphQL for the corners the SDK does
not cover (incidents). We build it once from the environment and pass it down.
"""

from __future__ import annotations

from datahub.ingestion.graph.client import DatahubClientConfig, DataHubGraph

from ..config import Settings, load_settings


def build_graph(settings: Settings | None = None) -> DataHubGraph:
    settings = settings or load_settings()
    return DataHubGraph(
        DatahubClientConfig(server=settings.gms_url.rstrip("/"), token=settings.gms_token)
    )
