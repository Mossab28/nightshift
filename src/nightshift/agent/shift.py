"""One shift: the pager goes off, an agent works the incident, a report exists.

The agent is a Claude Code session wired to two MCP servers at once:

* the official DataHub server, for reading the graph -- search, schemas,
  lineage, the SQL of transformations;
* the Nightshift server, for everything the official one cannot do -- recalling
  memory, opening and resolving incidents, guarding columns, remembering.

The runbook forces the order that makes the product compound: memory first,
lineage second, write-back always.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import os
import sys
from dataclasses import dataclass, field

from rich.console import Console

from .runbook import ONCALL_SYSTEM_PROMPT, incident_briefing


@dataclass
class ShiftEvent:
    """One visible step of the night, for the report and the war-room UI."""

    at: dt.datetime
    kind: str  # "thought" | "tool" | "result"
    label: str
    detail: str = ""


@dataclass
class ShiftReport:
    symptom: str
    entry_point_urn: str
    started_at: dt.datetime
    events: list[ShiftEvent] = field(default_factory=list)
    conclusion: str = ""
    ended_at: dt.datetime | None = None

    @property
    def duration_minutes(self) -> float:
        if self.ended_at is None:
            return 0.0
        return (self.ended_at - self.started_at).total_seconds() / 60

    def to_dict(self) -> dict:
        return {
            "symptom": self.symptom,
            "entry_point_urn": self.entry_point_urn,
            "started_at": self.started_at.isoformat(timespec="seconds"),
            "ended_at": self.ended_at.isoformat(timespec="seconds") if self.ended_at else None,
            "duration_minutes": round(self.duration_minutes, 2),
            "conclusion": self.conclusion,
            "events": [
                {
                    "at": e.at.isoformat(timespec="seconds"),
                    "kind": e.kind,
                    "label": e.label,
                    "detail": e.detail,
                }
                for e in self.events
            ],
        }

    def to_markdown(self) -> str:
        lines = [
            "# Nightshift -- morning report",
            "",
            f"**Paged at:** {self.started_at.isoformat(timespec='seconds')}",
            f"**Symptom:** {self.symptom}",
            f"**Entry point:** `{self.entry_point_urn}`",
            f"**Shift length:** {self.duration_minutes:.1f} min",
            "",
            "## What happened tonight",
            "",
        ]
        for e in self.events:
            stamp = e.at.strftime("%H:%M:%S")
            if e.kind == "tool":
                lines.append(f"- `{stamp}` **{e.label}** {e.detail}".rstrip())
        lines += ["", "## Conclusion", "", self.conclusion or "_(no conclusion recorded)_"]
        return "\n".join(lines)


def _mcp_servers() -> dict:
    """Both servers, built from the same environment the CLI already uses."""
    env = {
        "DATAHUB_GMS_URL": os.environ.get("DATAHUB_GMS_URL", "http://localhost:8080"),
        "DATAHUB_GMS_TOKEN": os.environ.get("DATAHUB_GMS_TOKEN", ""),
        "GITHUB_TOKEN": os.environ.get("GITHUB_TOKEN", ""),
        "NIGHTSHIFT_FIX_REPO": os.environ.get(
            "NIGHTSHIFT_FIX_REPO", "Mossab28/nightshift-dbt-demo"
        ),
    }
    return {
        "datahub": {
            "command": "uvx",
            "args": ["mcp-server-datahub@latest"],
            "env": env,
        },
        "nightshift": {
            "command": sys.executable,
            "args": ["-m", "nightshift.mcp_server"],
            "env": env,
        },
    }


async def _run(
    symptom: str,
    entry_point_urn: str,
    console: Console,
    on_event=None,
) -> ShiftReport:
    from claude_agent_sdk import (
        AssistantMessage,
        ClaudeAgentOptions,
        ResultMessage,
        TextBlock,
        ToolUseBlock,
        query,
    )

    report = ShiftReport(
        symptom=symptom,
        entry_point_urn=entry_point_urn,
        started_at=dt.datetime.now(),
    )

    options = ClaudeAgentOptions(
        system_prompt=ONCALL_SYSTEM_PROMPT,
        mcp_servers=_mcp_servers(),
        allowed_tools=[
            "mcp__datahub",  # the whole read surface
            "mcp__nightshift",  # memory + write-back
        ],
        disallowed_tools=["Bash", "WebSearch", "WebFetch", "Write", "Edit"],
        permission_mode="bypassPermissions",
        max_turns=40,
        max_budget_usd=float(os.environ.get("NIGHTSHIFT_SHIFT_BUDGET_USD", "1.5")),
    )

    console.print("[bold]The pager goes off.[/bold]\n")

    async for message in query(
        prompt=incident_briefing(symptom, entry_point_urn), options=options
    ):
        now = dt.datetime.now()
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, ToolUseBlock):
                    label = block.name.replace("mcp__", "").replace("__", " / ")
                    detail = _summarize_input(block.input)
                    event = ShiftEvent(at=now, kind="tool", label=label, detail=detail)
                    report.events.append(event)
                    if on_event:
                        on_event(event)
                    console.print(f"  [cyan]{label}[/cyan] [dim]{detail}[/dim]")
                elif isinstance(block, TextBlock) and block.text.strip():
                    event = ShiftEvent(at=now, kind="thought", label="", detail=block.text)
                    report.events.append(event)
                    if on_event:
                        on_event(event)
                    console.print(f"[white]{block.text.strip()}[/white]\n")
        elif isinstance(message, ResultMessage):
            report.conclusion = message.result or ""
            report.ended_at = now

    if report.ended_at is None:
        report.ended_at = dt.datetime.now()
    return report


def _summarize_input(payload: object) -> str:
    if not isinstance(payload, dict):
        return ""
    interesting = {
        k: v
        for k, v in payload.items()
        if isinstance(v, str) and len(v) < 120
    }
    return ", ".join(f"{k}={v}" for k, v in list(interesting.items())[:3])


def run_shift(*, symptom: str, entry_point_urn: str, console: Console) -> ShiftReport:
    return asyncio.run(_run(symptom, entry_point_urn, console))
