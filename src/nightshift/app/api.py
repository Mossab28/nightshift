"""The Nightshift SaaS backend.

Auth, workspaces, shifts and the Sentinel -- everything the frontend needs,
under `/api`. The agents' conclusions still live in the customer's DataHub;
this tier orchestrates and remembers the run history.
"""

from __future__ import annotations

import datetime as dt
import threading

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr

from .db import Session as DbSession
from .db import Shift, User, Watch, Workspace, make_session_factory
from .security import decrypt_token, encrypt_token, hash_password, verify_password

router = APIRouter(prefix="/api")
SessionFactory = make_session_factory()

COOKIE = "nightshift_session"

# --------------------------------------------------------------------- auth


class Credentials(BaseModel):
    email: EmailStr
    password: str


def _current_user(request: Request) -> User:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "not signed in")
    with SessionFactory() as db:
        session = db.get(DbSession, token)
        if not session or session.expires_at < dt.datetime.now(dt.timezone.utc).replace(
            tzinfo=None
        ):
            raise HTTPException(401, "session expired")
        user = db.get(User, session.user_id)
        if not user:
            raise HTTPException(401, "unknown user")
        return user


@router.post("/auth/register")
def register(creds: Credentials, response: Response) -> dict:
    with SessionFactory() as db:
        if db.query(User).filter_by(email=creds.email.lower()).first():
            raise HTTPException(409, "an account already exists for this email")
        if len(creds.password) < 8:
            raise HTTPException(422, "password must be at least 8 characters")
        user = User(email=creds.email.lower(), password_hash=hash_password(creds.password))
        db.add(user)
        db.commit()
        workspace = Workspace(owner_id=user.id, name="My data team")
        db.add(workspace)
        session = DbSession(user_id=user.id)
        db.add(session)
        db.commit()
        response.set_cookie(COOKIE, session.token, httponly=True, samesite="lax")
        return {"user": {"email": user.email}, "workspace_id": workspace.id}


@router.post("/auth/login")
def login(creds: Credentials, response: Response) -> dict:
    with SessionFactory() as db:
        user = db.query(User).filter_by(email=creds.email.lower()).first()
        if not user or not verify_password(creds.password, user.password_hash):
            raise HTTPException(401, "wrong email or password")
        session = DbSession(user_id=user.id)
        db.add(session)
        db.commit()
        response.set_cookie(COOKIE, session.token, httponly=True, samesite="lax")
        return {"user": {"email": user.email}}


@router.post("/auth/logout")
def logout(request: Request, response: Response) -> dict:
    token = request.cookies.get(COOKIE)
    if token:
        with SessionFactory() as db:
            session = db.get(DbSession, token)
            if session:
                db.delete(session)
                db.commit()
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/auth/me")
def me(user: User = Depends(_current_user)) -> dict:
    with SessionFactory() as db:
        workspaces = db.query(Workspace).filter_by(owner_id=user.id).all()
        return {
            "email": user.email,
            "workspaces": [{"id": w.id, "name": w.name} for w in workspaces],
        }


# --------------------------------------------------------------- workspaces


def _workspace_of(user: User, workspace_id: str, db) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if not workspace or workspace.owner_id != user.id:
        raise HTTPException(404, "workspace not found")
    return workspace


class ConnectionInput(BaseModel):
    gms_url: str
    gms_token: str = ""


class SentinelInput(BaseModel):
    enabled: bool
    interval_s: int = 120


class WatchInput(BaseModel):
    dataset_urn: str


@router.get("/workspaces/{workspace_id}")
def get_workspace(workspace_id: str, user: User = Depends(_current_user)) -> dict:
    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        watches = db.query(Watch).filter_by(workspace_id=w.id).all()
        return {
            "id": w.id,
            "name": w.name,
            "gms_url": w.gms_url,
            "has_token": bool(w.gms_token_encrypted),
            "connected": bool(w.gms_url),
            "sentinel_enabled": w.sentinel_enabled,
            "sentinel_interval_s": w.sentinel_interval_s,
            "watches": [
                {
                    "id": watch.id,
                    "dataset_urn": watch.dataset_urn,
                    "last_checked_at": (
                        watch.last_checked_at.isoformat() if watch.last_checked_at else None
                    ),
                }
                for watch in watches
            ],
        }


@router.put("/workspaces/{workspace_id}/connection")
def set_connection(
    workspace_id: str, body: ConnectionInput, user: User = Depends(_current_user)
) -> dict:
    from ..config import Settings
    from ..datahub.client import build_graph

    settings = Settings(gms_url=body.gms_url, gms_token=body.gms_token or None)
    try:
        build_graph(settings).test_connection()
    except Exception as exc:
        raise HTTPException(422, f"could not reach this DataHub: {exc}") from exc
    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        w.gms_url = body.gms_url
        w.gms_token_encrypted = encrypt_token(body.gms_token)
        db.commit()
    return {"connected": True}


@router.put("/workspaces/{workspace_id}/sentinel")
def set_sentinel(
    workspace_id: str, body: SentinelInput, user: User = Depends(_current_user)
) -> dict:
    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        w.sentinel_enabled = body.enabled
        w.sentinel_interval_s = max(30, body.interval_s)
        db.commit()
    return {"sentinel_enabled": body.enabled}


@router.post("/workspaces/{workspace_id}/watches")
def add_watch(
    workspace_id: str, body: WatchInput, user: User = Depends(_current_user)
) -> dict:
    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        watch = Watch(workspace_id=w.id, dataset_urn=body.dataset_urn)
        db.add(watch)
        db.commit()
        return {"id": watch.id}


@router.delete("/workspaces/{workspace_id}/watches/{watch_id}")
def remove_watch(
    workspace_id: str, watch_id: str, user: User = Depends(_current_user)
) -> dict:
    with SessionFactory() as db:
        _workspace_of(user, workspace_id, db)
        watch = db.get(Watch, watch_id)
        if watch and watch.workspace_id == workspace_id:
            db.delete(watch)
            db.commit()
    return {"ok": True}


# ------------------------------------------------------------------- shifts


class ShiftInput(BaseModel):
    symptom: str
    entry_point_urn: str


def _graph_env(workspace: Workspace) -> dict[str, str]:
    return {
        "DATAHUB_GMS_URL": workspace.gms_url,
        "DATAHUB_GMS_TOKEN": decrypt_token(workspace.gms_token_encrypted),
        "NIGHTSHIFT_SHIFT_BUDGET_USD": str(workspace.shift_budget_usd),
    }


def run_shift_for_workspace(
    workspace_id: str, symptom: str, entry_point_urn: str, trigger: str
) -> str:
    """Start a shift in a worker thread; returns the shift id immediately."""
    import os

    from rich.console import Console

    with SessionFactory() as db:
        workspace = db.get(Workspace, workspace_id)
        if not workspace or not workspace.gms_url:
            raise HTTPException(422, "workspace has no DataHub connection")
        running = (
            db.query(Shift).filter_by(workspace_id=workspace_id, status="running").count()
        )
        if running:
            raise HTTPException(409, "a shift is already running in this workspace")
        shift = Shift(
            workspace_id=workspace_id,
            trigger=trigger,
            symptom=symptom,
            entry_point_urn=entry_point_urn,
        )
        db.add(shift)
        db.commit()
        shift_id = shift.id
        env = _graph_env(workspace)

    def work() -> None:
        import asyncio

        from ..agent.shift import _run

        def push(event) -> None:
            with SessionFactory() as db:
                row = db.get(Shift, shift_id)
                row.events = list(row.events) + [
                    {
                        "at": event.at.isoformat(timespec="seconds"),
                        "kind": event.kind,
                        "label": event.label,
                        "detail": event.detail,
                    }
                ]
                db.commit()

        previous = {k: os.environ.get(k) for k in env}
        os.environ.update(env)
        try:
            report = asyncio.run(
                _run(symptom, entry_point_urn, Console(quiet=True), on_event=push)
            )
            with SessionFactory() as db:
                row = db.get(Shift, shift_id)
                row.status = "done"
                row.conclusion = report.conclusion
                row.ended_at = dt.datetime.utcnow()
                tools = [e for e in row.events if e["kind"] == "tool"]
                write = {
                    "nightshift / open_incident",
                    "nightshift / resolve_incident",
                    "nightshift / guard_column",
                    "nightshift / remember_incident",
                }
                row.investigation_calls = next(
                    (i for i, e in enumerate(tools) if e["label"] in write), len(tools)
                )
                row.started_from_memory = any(
                    "recall" in e["label"] for e in tools[:3]
                ) and "memory" in report.conclusion.lower()
                db.commit()
        except Exception as exc:
            with SessionFactory() as db:
                row = db.get(Shift, shift_id)
                row.status = "failed"
                row.conclusion = f"shift failed: {exc}"
                row.ended_at = dt.datetime.utcnow()
                db.commit()
        finally:
            for k, v in previous.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v

    threading.Thread(target=work, daemon=True).start()
    return shift_id


@router.post("/workspaces/{workspace_id}/shifts")
def start_shift(
    workspace_id: str, body: ShiftInput, user: User = Depends(_current_user)
) -> dict:
    with SessionFactory() as db:
        _workspace_of(user, workspace_id, db)
    shift_id = run_shift_for_workspace(
        workspace_id, body.symptom, body.entry_point_urn, trigger="manual"
    )
    return {"shift_id": shift_id}


@router.get("/workspaces/{workspace_id}/shifts")
def list_shifts(workspace_id: str, user: User = Depends(_current_user)) -> list[dict]:
    with SessionFactory() as db:
        _workspace_of(user, workspace_id, db)
        shifts = (
            db.query(Shift)
            .filter_by(workspace_id=workspace_id)
            .order_by(Shift.started_at.desc())
            .limit(50)
            .all()
        )
        return [
            {
                "id": s.id,
                "trigger": s.trigger,
                "symptom": s.symptom,
                "status": s.status,
                "started_at": s.started_at.isoformat(),
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "investigation_calls": s.investigation_calls,
                "started_from_memory": s.started_from_memory,
            }
            for s in shifts
        ]


@router.get("/workspaces/{workspace_id}/shifts/{shift_id}")
def get_shift(
    workspace_id: str, shift_id: str, user: User = Depends(_current_user)
) -> dict:
    with SessionFactory() as db:
        _workspace_of(user, workspace_id, db)
        s = db.get(Shift, shift_id)
        if not s or s.workspace_id != workspace_id:
            raise HTTPException(404, "shift not found")
        return {
            "id": s.id,
            "trigger": s.trigger,
            "symptom": s.symptom,
            "entry_point_urn": s.entry_point_urn,
            "status": s.status,
            "events": s.events,
            "conclusion": s.conclusion,
            "started_at": s.started_at.isoformat(),
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        }


# --------------------------------------------------------- live pipeline
# Real Break → Wake → Restore on the workspace DataHub (same scenario as try.*,
# no mocks). Planted state is per-workspace in process memory.


@router.get("/workspaces/{workspace_id}/live")
def live_state(workspace_id: str, user: User = Depends(_current_user)) -> dict:
    from . import live_pipeline

    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        running = (
            db.query(Shift)
            .filter_by(workspace_id=workspace_id, status="running")
            .count()
        )
        gms_url = w.gms_url or ""
        token = (
            decrypt_token(w.gms_token_encrypted) if w.gms_token_encrypted else ""
        )
    planted = live_pipeline.get_planted(workspace_id)
    return {
        "connected": bool(gms_url),
        "planted": planted,
        "shift_running": running > 0,
        "targets": live_pipeline.targets(),
        "gms_url": gms_url,
        "has_token": bool(token),
    }


def _workspace_gms(w: Workspace) -> tuple[str, str]:
    if not w.gms_url:
        raise HTTPException(422, "connect DataHub in Settings first")
    token = decrypt_token(w.gms_token_encrypted) if w.gms_token_encrypted else ""
    return w.gms_url, token


@router.post("/workspaces/{workspace_id}/live/break")
def live_break(workspace_id: str, user: User = Depends(_current_user)) -> dict:
    from . import live_pipeline

    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        if (
            db.query(Shift)
            .filter_by(workspace_id=workspace_id, status="running")
            .count()
        ):
            raise HTTPException(409, "a shift is already running")
        if live_pipeline.get_planted(workspace_id):
            raise HTTPException(409, "already broken -- wake the night shift")
        gms_url, token = _workspace_gms(w)
    planted = live_pipeline.break_on_workspace(gms_url, token)
    live_pipeline.set_planted(workspace_id, planted)
    return {"broken": True, **planted}


@router.post("/workspaces/{workspace_id}/live/restore")
def live_restore(workspace_id: str, user: User = Depends(_current_user)) -> dict:
    from . import live_pipeline

    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        if (
            db.query(Shift)
            .filter_by(workspace_id=workspace_id, status="running")
            .count()
        ):
            raise HTTPException(409, "shift is still running -- wait for it to finish")
        gms_url, token = _workspace_gms(w)
    live_pipeline.restore_on_workspace(gms_url, token)
    live_pipeline.set_planted(workspace_id, None)
    return {"restored": True, "note": "The graph keeps its memories."}


@router.post("/workspaces/{workspace_id}/live/wake")
def live_wake(workspace_id: str, user: User = Depends(_current_user)) -> dict:
    """One-click wake after a real break: starts a normal agent shift on the graph."""
    from . import live_pipeline

    planted = live_pipeline.get_planted(workspace_id)
    if not planted:
        raise HTTPException(409, "nothing is broken -- break the pipeline first")
    with SessionFactory() as db:
        _workspace_of(user, workspace_id, db)
    shift_id = run_shift_for_workspace(
        workspace_id,
        planted["symptom"],
        planted["victim_urn"],
        trigger="manual",
    )
    return {"shift_id": shift_id, "started": True}


# ------------------------------------------------------------------ memory


@router.get("/workspaces/{workspace_id}/memory")
def browse_memory(workspace_id: str, user: User = Depends(_current_user)) -> dict:
    """The Memory Browser: everything Nightshift knows, straight from the graph."""
    from ..config import Settings
    from ..datahub.client import build_graph
    from ..memory import GraphMemory

    with SessionFactory() as db:
        w = _workspace_of(user, workspace_id, db)
        if not w.gms_url:
            raise HTTPException(422, "workspace has no DataHub connection")
        settings = Settings(
            gms_url=w.gms_url, gms_token=decrypt_token(w.gms_token_encrypted) or None
        )
    graph = build_graph(settings)
    memory = GraphMemory(graph)

    # Every dataset carrying a nightshift failure-mode tag, then its postmortems.
    query = """
    query t($input: SearchInput!) {
      search(input: $input) { searchResults { entity { urn } } }
    }
    """
    data = graph.execute_graphql(
        query,
        {"input": {"type": "DATASET", "query": 'tags:"urn:li:tag:nightshift.*"', "start": 0, "count": 100}},
    )
    urns = [
        r["entity"]["urn"]
        for r in (data.get("search") or {}).get("searchResults", [])
        if r.get("entity")
    ]
    assets = []
    for urn in urns:
        postmortems = memory.recall(urn)
        if postmortems:
            assets.append(
                {
                    "dataset_urn": urn,
                    "postmortems": [p.__dict__ for p in postmortems],
                }
            )
    return {"assets": assets, "total_postmortems": sum(len(a["postmortems"]) for a in assets)}


# ------------------------------------------------------------------- stats


@router.get("/workspaces/{workspace_id}/stats")
def stats(workspace_id: str, user: User = Depends(_current_user)) -> dict:
    """The ROI counter: what memory saves, measured on this workspace's shifts."""
    with SessionFactory() as db:
        _workspace_of(user, workspace_id, db)
        done = (
            db.query(Shift)
            .filter_by(workspace_id=workspace_id, status="done")
            .order_by(Shift.started_at)
            .all()
        )
    cold = [s for s in done if not s.started_from_memory]
    warm = [s for s in done if s.started_from_memory]

    def avg(values: list[float]) -> float | None:
        return round(sum(values) / len(values), 2) if values else None

    def minutes(s: Shift) -> float:
        if not s.ended_at:
            return 0.0
        return (s.ended_at - s.started_at).total_seconds() / 60

    return {
        "shifts_total": len(done),
        "from_memory": len(warm),
        "cold": {
            "avg_investigation_calls": avg([float(s.investigation_calls) for s in cold]),
            "avg_minutes": avg([minutes(s) for s in cold]),
        },
        "memory": {
            "avg_investigation_calls": avg([float(s.investigation_calls) for s in warm]),
            "avg_minutes": avg([minutes(s) for s in warm]),
        },
    }
