"""Live Break → Wake → Restore inside the SaaS, on the workspace DataHub.

Same real scenario as try.* (schema rewrite on the graph). No mocks: the
workspace GMS credentials drive `break_pipeline` / `restore_pipeline` /
`run_shift_for_workspace`.
"""

from __future__ import annotations

import os
import threading
from dataclasses import asdict
from typing import Any

# Showcase-ecommerce defaults (same graph the VPS demo account uses).
DEFAULT_UPSTREAM = (
    "urn:li:dataset:(urn:li:dataPlatform:snowflake,"
    "b2fd91.order_entry_db.order_entry.orders,PROD)"
)
DEFAULT_VICTIM = (
    "urn:li:dataset:(urn:li:dataPlatform:powerbi,"
    "b2fd91.datahub_order_entries.Essential_KPI_Measures,PROD)"
)
DEFAULT_OLD = "order_total"
DEFAULT_NEW = "order_amount"

_lock = threading.Lock()
# workspace_id -> planted incident dict (real break on that workspace's graph)
_planted: dict[str, dict[str, Any]] = {}


def targets() -> dict[str, str]:
    return {
        "upstream_urn": os.environ.get("NIGHTSHIFT_DEMO_UPSTREAM_URN", DEFAULT_UPSTREAM),
        "victim_urn": os.environ.get("NIGHTSHIFT_DEMO_VICTIM_URN", DEFAULT_VICTIM),
        "old_column": os.environ.get("NIGHTSHIFT_DEMO_OLD_COLUMN", DEFAULT_OLD),
        "new_column": os.environ.get("NIGHTSHIFT_DEMO_NEW_COLUMN", DEFAULT_NEW),
    }


def get_planted(workspace_id: str) -> dict[str, Any] | None:
    with _lock:
        planted = _planted.get(workspace_id)
        return dict(planted) if planted else None


def set_planted(workspace_id: str, planted: dict[str, Any] | None) -> None:
    with _lock:
        if planted is None:
            _planted.pop(workspace_id, None)
        else:
            _planted[workspace_id] = planted


def break_on_workspace(gms_url: str, gms_token: str) -> dict[str, Any]:
    from ..config import Settings
    from ..datahub.client import build_graph
    from ..scenario import PlantedIncident, ScenarioError, break_pipeline

    t = targets()
    graph = build_graph(Settings(gms_url=gms_url, gms_token=gms_token or None))
    try:
        planted = break_pipeline(
            graph,
            upstream_urn=t["upstream_urn"],
            old_column=t["old_column"],
            new_column=t["new_column"],
            victim_urn=t["victim_urn"],
        )
    except ScenarioError:
        planted = PlantedIncident(
            upstream_urn=t["upstream_urn"],
            old_column=t["old_column"],
            new_column=t["new_column"],
            victim_urn=t["victim_urn"],
            symptom=(
                "The revenue dashboard is showing zero for last week. It was fine "
                "at yesterday's close; it broke overnight. Finance noticed before "
                "we did."
            ),
        )
    return asdict(planted)


def restore_on_workspace(gms_url: str, gms_token: str) -> None:
    from ..config import Settings
    from ..datahub.client import build_graph
    from ..scenario import restore_pipeline

    t = targets()
    graph = build_graph(Settings(gms_url=gms_url, gms_token=gms_token or None))
    restore_pipeline(
        graph,
        upstream_urn=t["upstream_urn"],
        old_column=t["old_column"],
        new_column=t["new_column"],
    )
