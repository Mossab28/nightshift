"""The war room: one night of on-call work, on one dark page.

Deliberately thin -- the DataHub UI is already half the demo. This page exists
for the other half: watching the *shape* of a shift. Memory consulted first,
lineage walked once, one root cause, and the write-back trail at the end.
"""

from __future__ import annotations

import html
import json
import pathlib

_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nightshift &mdash; war room</title>
<style>
  :root {{
    --bg: #0b0e14;
    --panel: #11151f;
    --line: #1e2433;
    --text: #d7dce6;
    --dim: #6b7385;
    --moon: #ffd76e;
    --tool: #6ea8ff;
    --memory: #b98aff;
    --write: #5fd29a;
    --alarm: #ff6b6b;
  }}
  * {{ box-sizing: border-box; margin: 0; }}
  body {{
    background: var(--bg); color: var(--text);
    font: 15px/1.55 "SF Mono", ui-monospace, Menlo, monospace;
    padding: 48px 24px; display: flex; justify-content: center;
  }}
  main {{ max-width: 860px; width: 100%; }}
  header h1 {{ font-size: 22px; font-weight: 600; letter-spacing: .04em; }}
  header h1 .moon {{ color: var(--moon); }}
  .symptom {{
    margin: 24px 0 8px; padding: 16px 20px; background: var(--panel);
    border: 1px solid var(--line); border-left: 3px solid var(--alarm);
    border-radius: 8px;
  }}
  .symptom .label {{ color: var(--alarm); font-size: 12px; letter-spacing: .12em; }}
  .meta {{ color: var(--dim); font-size: 13px; margin-bottom: 32px; }}
  .timeline {{ border-left: 1px solid var(--line); margin-left: 8px; padding-left: 28px; }}
  .event {{ position: relative; margin-bottom: 22px; }}
  .event::before {{
    content: ""; position: absolute; left: -33px; top: 6px;
    width: 9px; height: 9px; border-radius: 50%;
    background: var(--dim);
  }}
  .event.tool::before {{ background: var(--tool); }}
  .event.memory::before {{ background: var(--memory); box-shadow: 0 0 10px var(--memory); }}
  .event.write::before {{ background: var(--write); box-shadow: 0 0 10px var(--write); }}
  .event .stamp {{ color: var(--dim); font-size: 12px; }}
  .event .label {{ font-weight: 600; }}
  .event.tool .label {{ color: var(--tool); }}
  .event.memory .label {{ color: var(--memory); }}
  .event.write .label {{ color: var(--write); }}
  .event .detail {{ color: var(--dim); font-size: 13px; word-break: break-all; }}
  .event.thought .detail {{
    color: var(--text); background: var(--panel); border: 1px solid var(--line);
    border-radius: 8px; padding: 12px 16px; margin-top: 6px; white-space: pre-wrap;
    word-break: normal; font-size: 13.5px;
  }}
  .conclusion {{
    margin-top: 36px; padding: 20px 24px; background: var(--panel);
    border: 1px solid var(--line); border-left: 3px solid var(--write);
    border-radius: 8px; white-space: pre-wrap;
  }}
  .conclusion .label {{ color: var(--write); font-size: 12px; letter-spacing: .12em; }}
  footer {{ margin-top: 40px; color: var(--dim); font-size: 12px; }}
</style>
</head>
<body>
<main>
  <header>
    <h1><span class="moon">&#9789;</span> NIGHTSHIFT <span style="color:var(--dim)">/ war room</span></h1>
  </header>
  <div class="symptom">
    <div class="label">PAGED &mdash; {started}</div>
    <div>{symptom}</div>
  </div>
  <div class="meta">entry point&nbsp; {entry_point}<br>shift length&nbsp; {duration} min</div>
  <div class="timeline">
{events}
  </div>
  <div class="conclusion">
    <div class="label">MORNING REPORT</div>
    <div>{conclusion}</div>
  </div>
  <footer>Written by the night shift. The graph remembers.</footer>
</main>
</body>
</html>
"""

_EVENT = """    <div class="event {css}">
      <span class="stamp">{stamp}</span> <span class="label">{label}</span>
      <div class="detail">{detail}</div>
    </div>
"""


def _classify(event: dict) -> str:
    label = event.get("label", "")
    if event["kind"] == "thought":
        return "thought"
    if "recall" in label or "failure_mode" in label:
        return "memory"
    if any(k in label for k in ("remember", "incident", "guard")):
        return "write"
    return "tool"


def render(shift: dict) -> str:
    events_html = []
    for event in shift.get("events", []):
        css = _classify(event)
        stamp = event["at"].split("T")[-1]
        label = event["label"] or ("&mdash;" if css == "thought" else "")
        events_html.append(
            _EVENT.format(
                css=css,
                stamp=stamp,
                label=html.escape(label) if event["label"] else label,
                detail=html.escape(event.get("detail", "")),
            )
        )
    return _PAGE.format(
        started=html.escape(shift.get("started_at", "")),
        symptom=html.escape(shift.get("symptom", "")),
        entry_point=html.escape(shift.get("entry_point_urn", "")),
        duration=shift.get("duration_minutes", "?"),
        events="".join(events_html),
        conclusion=html.escape(shift.get("conclusion", "")),
    )


def render_file(json_path: pathlib.Path) -> pathlib.Path:
    shift = json.loads(json_path.read_text())
    out = json_path.with_suffix(".html")
    out.write_text(render(shift))
    return out
