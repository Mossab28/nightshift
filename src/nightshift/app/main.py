"""The Nightshift product: API + frontend + Sentinel, one process.

    NIGHTSHIFT_SECRET=... nightshift-app
"""

from __future__ import annotations

import pathlib

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import sentinel
from .api import router

STATIC = pathlib.Path(__file__).parent / "static"

app = FastAPI(title="Nightshift")
app.include_router(router)


@app.on_event("startup")
def _start_sentinel() -> None:
    sentinel.start()


app.mount("/assets", StaticFiles(directory=STATIC / "assets"), name="assets")


@app.get("/")
def landing() -> FileResponse:
    """Product landing page on the root path exactly."""
    return FileResponse(STATIC / "landing.html")


@app.get("/favicon.ico")
def favicon() -> FileResponse:
    return FileResponse(STATIC / "assets" / "favicon.svg", media_type="image/svg+xml")


@app.get("/demo")
def demo() -> FileResponse:
    """Public demo-video page for Devpost / judges."""
    return FileResponse(STATIC / "demo.html")


@app.get("/{page:path}")
def spa(page: str) -> FileResponse:
    """Single-page app: /app and every other non-API path serve the shell."""
    return FileResponse(STATIC / "index.html")


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8788)


if __name__ == "__main__":
    main()
