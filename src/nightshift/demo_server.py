"""The judge's demo: break a real pipeline, watch the night shift take it.

One small FastAPI app, meant to sit on a host next to a DataHub instance:

* `GET  /`            -- the war-room page, live
* `POST /api/break`   -- silently rename the upstream column (the red button)
* `POST /api/shift`   -- hand the pager to the agents
* `GET  /api/state`   -- planted incident + shift status + events so far
* `POST /api/reset`   -- restore the schema (memories are kept, that is the point)

The shift runs in a background thread and streams its events into a shared
state object the page polls. Deliberately no database: one demo, one state.
"""

from __future__ import annotations

import datetime as dt
import threading
from dataclasses import asdict, dataclass, field
from typing import Any

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

from .config import load_settings
from .datahub.client import build_graph
from .scenario import break_pipeline, restore_pipeline

# Demo targets: the showcase-ecommerce story.
UPSTREAM = (
    "urn:li:dataset:(urn:li:dataPlatform:snowflake,"
    "b2fd91.order_entry_db.order_entry.orders,PROD)"
)
VICTIM = (
    "urn:li:dataset:(urn:li:dataPlatform:powerbi,"
    "b2fd91.datahub_order_entries.Essential_KPI_Measures,PROD)"
)
OLD_COLUMN, NEW_COLUMN = "order_total", "order_amount"


@dataclass
class DemoState:
    planted: dict | None = None
    shift_running: bool = False
    shift_events: list[dict] = field(default_factory=list)
    shift_conclusion: str = ""
    shift_started_at: str | None = None
    nights: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            return {
                "planted": self.planted,
                "shift_running": self.shift_running,
                "events": list(self.shift_events),
                "conclusion": self.shift_conclusion,
                "started_at": self.shift_started_at,
                "nights": self.nights,
            }


STATE = DemoState()
app = FastAPI(title="Nightshift demo")


def _graph():
    return build_graph(load_settings())


@app.post("/api/break")
def do_break() -> JSONResponse:
    with STATE.lock:
        if STATE.planted:
            return JSONResponse({"error": "already broken -- run the shift"}, 409)
    from .scenario import PlantedIncident, ScenarioError

    try:
        planted = break_pipeline(
            _graph(),
            upstream_urn=UPSTREAM,
            old_column=OLD_COLUMN,
            new_column=NEW_COLUMN,
            victim_urn=VICTIM,
        )
    except ScenarioError:
        # The graph is already broken (a previous session left it so). Adopt
        # that break as ours instead of erroring at the judge.
        planted = PlantedIncident(
            upstream_urn=UPSTREAM,
            old_column=OLD_COLUMN,
            new_column=NEW_COLUMN,
            victim_urn=VICTIM,
            symptom=(
                "The revenue dashboard is showing zero for last week. It was fine "
                "at yesterday's close; it broke overnight. Finance noticed before "
                "we did."
            ),
        )
    with STATE.lock:
        STATE.planted = asdict(planted)
        STATE.shift_events = []
        STATE.shift_conclusion = ""
    return JSONResponse({"broken": True, **asdict(planted)})


@app.post("/api/reset")
def do_reset() -> JSONResponse:
    restore_pipeline(
        _graph(), upstream_urn=UPSTREAM, old_column=OLD_COLUMN, new_column=NEW_COLUMN
    )
    with STATE.lock:
        STATE.planted = None
    return JSONResponse({"restored": True, "note": "The graph keeps its memories."})


def _run_shift_thread(symptom: str, entry_point: str) -> None:
    import asyncio

    from rich.console import Console

    from .agent.shift import _run

    def push(event) -> None:
        with STATE.lock:
            STATE.shift_events.append(
                {
                    "at": event.at.isoformat(timespec="seconds"),
                    "kind": event.kind,
                    "label": event.label,
                    "detail": event.detail,
                }
            )

    async def _capture() -> None:
        report = await _run(symptom, entry_point, Console(quiet=True), on_event=push)
        with STATE.lock:
            STATE.shift_conclusion = report.conclusion
            STATE.shift_running = False
            STATE.nights += 1

    try:
        asyncio.run(_capture())
    except Exception as exc:  # surface the failure on the page, never hang it
        with STATE.lock:
            STATE.shift_running = False
            STATE.shift_conclusion = f"shift failed: {exc}"


#: Hard cap on agent runs for the whole demo deployment. At ~$1.5 per shift
#: this keeps worst-case spend far under the key's budget.
MAX_NIGHTS = int(__import__("os").environ.get("NIGHTSHIFT_MAX_NIGHTS", "25"))


@app.post("/api/shift")
def do_shift() -> JSONResponse:
    with STATE.lock:
        if STATE.nights >= MAX_NIGHTS:
            return JSONResponse(
                {"error": "demo budget exhausted -- run it locally with `make demo`"},
                429,
            )
        if STATE.shift_running:
            return JSONResponse({"error": "a shift is already running"}, 409)
        if not STATE.planted:
            return JSONResponse({"error": "nothing is broken -- press the button"}, 409)
        STATE.shift_running = True
        STATE.shift_started_at = dt.datetime.now().isoformat(timespec="seconds")
        symptom = STATE.planted["symptom"]
        victim = STATE.planted["victim_urn"]
    threading.Thread(
        target=_run_shift_thread, args=(symptom, victim), daemon=True
    ).start()
    return JSONResponse({"started": True})


@app.get("/api/state")
def get_state() -> JSONResponse:
    return JSONResponse(STATE.snapshot())


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    from .warroom_live import LIVE_PAGE

    return LIVE_PAGE


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8787)


if __name__ == "__main__":
    main()
