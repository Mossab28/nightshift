"""The Sentinel: the on-call rotation with nobody on it.

A background loop per process. For every workspace that enabled it, the
Sentinel fingerprints the schema of each watched dataset on an interval. When
a fingerprint changes -- a column renamed, dropped, retyped -- it does what a
human never gets to do at 2:47am: it notices immediately, and it wakes the
night shift itself. No pager, no human, no button.

The demo's red button becomes just one way of making the Sentinel fire.
"""

from __future__ import annotations

import datetime as dt
import logging
import threading
import time

import datahub.metadata.schema_classes as models

from ..config import Settings
from ..datahub.client import build_graph
from .db import Watch, Workspace, make_session_factory
from .security import decrypt_token

log = logging.getLogger("nightshift.sentinel")

SessionFactory = make_session_factory()


def _fingerprint(graph, dataset_urn: str) -> str:
    schema = graph.get_aspect(dataset_urn, models.SchemaMetadataClass)
    if schema is None:
        return ""
    return "|".join(sorted(f"{f.fieldPath}:{f.nativeDataType}" for f in schema.fields))


def _diff(before: str, after: str) -> str:
    old = dict(part.rsplit(":", 1) for part in before.split("|") if ":" in part)
    new = dict(part.rsplit(":", 1) for part in after.split("|") if ":" in part)
    gone = sorted(set(old) - set(new))
    fresh = sorted(set(new) - set(old))
    retyped = sorted(k for k in set(old) & set(new) if old[k] != new[k])
    parts = []
    if gone:
        parts.append(f"columns gone: {', '.join(gone)}")
    if fresh:
        parts.append(f"columns new: {', '.join(fresh)}")
    if retyped:
        parts.append(f"columns retyped: {', '.join(retyped)}")
    return "; ".join(parts) or "schema changed"


def check_workspace(workspace: Workspace) -> list[str]:
    """One Sentinel pass over one workspace. Returns started shift ids."""
    from .api import run_shift_for_workspace

    settings = Settings(
        gms_url=workspace.gms_url,
        gms_token=decrypt_token(workspace.gms_token_encrypted) or None,
    )
    graph = build_graph(settings)
    started: list[str] = []
    with SessionFactory() as db:
        watches = db.query(Watch).filter_by(workspace_id=workspace.id).all()
        for watch in watches:
            current = _fingerprint(graph, watch.dataset_urn)
            previous = watch.schema_fingerprint
            watch.last_checked_at = dt.datetime.utcnow()
            if previous and current and current != previous:
                drift = _diff(previous, current)
                log.info("drift on %s: %s", watch.dataset_urn, drift)
                symptom = (
                    f"Sentinel detected a schema change on a watched upstream "
                    f"({drift}). Nobody announced it. Downstream consumers may "
                    f"already be broken."
                )
                try:
                    started.append(
                        run_shift_for_workspace(
                            workspace.id, symptom, watch.dataset_urn, trigger="sentinel"
                        )
                    )
                except Exception as exc:  # a running shift already covers it
                    log.info("shift not started: %s", exc)
            watch.schema_fingerprint = current
        db.commit()
    return started


def _loop(stop: threading.Event) -> None:
    while not stop.is_set():
        with SessionFactory() as db:
            workspaces = (
                db.query(Workspace)
                .filter_by(sentinel_enabled=True)
                .filter(Workspace.gms_url != "")
                .all()
            )
        soonest = 60
        for workspace in workspaces:
            try:
                check_workspace(workspace)
            except Exception as exc:
                log.warning("sentinel pass failed for %s: %s", workspace.id, exc)
            soonest = min(soonest, workspace.sentinel_interval_s)
        stop.wait(max(30, soonest))


_stop = threading.Event()
_thread: threading.Thread | None = None


def start() -> None:
    global _thread
    if _thread and _thread.is_alive():
        return
    _stop.clear()
    _thread = threading.Thread(target=_loop, args=(_stop,), daemon=True)
    _thread.start()


def stop() -> None:
    _stop.set()
