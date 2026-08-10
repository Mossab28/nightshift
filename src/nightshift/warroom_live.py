"""The live war-room page served by the demo server.

Judge-facing one-click demo: break the pipeline, wake the night shift, restore.
Murmell grammar matches the landing war-room chat (black ground, floating
surface, Figtree + IBM Plex Mono, chat stream + write-back rail).
"""

LIVE_PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nightshift / break it yourself</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --paper: #e4e7ec;
    --surface: #f7f8fa;
    --surface-bar: #eef0f4;
    --ink: #14161c;
    --ink-2: rgba(20, 22, 28, 0.72);
    --slate: rgba(20, 22, 28, 0.55);
    --slate-dim: rgba(20, 22, 28, 0.4);
    --rule-soft: rgba(20, 22, 28, 0.1);
    --moon: #8a6818;
    --tool: #2b5f9e;
    --memory: #5c408f;
    --write: #1a6b48;
    --alarm: #a82828;
    --radius: 6px;
    --font: "Figtree", system-ui, -apple-system, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { min-height: 100%; }
  body {
    background: var(--paper);
    color: var(--ink);
    font: 500 15px/1.5 var(--font);
    -webkit-font-smoothing: antialiased;
    padding: clamp(20px, 4vw, 40px);
    color-scheme: light;
  }
  .where {
    display: inline-flex; flex-wrap: wrap; gap: 8px; align-items: center;
    margin: 0 0 14px;
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--slate-dim);
  }
  .where b {
    font-weight: 500; color: var(--moon);
    border: 1px solid rgba(138,104,24,0.35); border-radius: 3px;
    padding: 4px 8px; background: rgba(138,104,24,0.08);
  }
  .where a { color: var(--tool); text-transform: none; letter-spacing: 0; }
  .shell { max-width: 1100px; margin: 0 auto; }
  .brand {
    display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .brand h1 {
    font-size: clamp(22px, 3vw, 28px);
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  .brand .moon { color: var(--moon); }
  .brand .slash { color: var(--slate-dim); font-weight: 400; }
  .sub {
    color: var(--ink-2);
    font-size: 14.5px;
    max-width: 54ch;
    margin-bottom: 22px;
  }

  .controls { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  button {
    font: 500 13px var(--font);
    padding: 11px 16px;
    border-radius: 10px;
    cursor: pointer;
    border: 1px solid var(--rule-soft);
    background: rgba(255, 255, 255, 0.03);
    color: var(--ink-2);
    transition: background 160ms ease, border-color 160ms ease, color 160ms ease, opacity 160ms ease;
  }
  button:disabled { opacity: 0.35; cursor: default; }
  #break {
    color: var(--alarm);
    border-color: rgba(255, 107, 107, 0.4);
    background: rgba(255, 107, 107, 0.08);
  }
  #break:hover:not(:disabled) { background: rgba(255, 107, 107, 0.14); }
  #shift {
    color: var(--moon);
    border-color: rgba(138, 104, 24, 0.4);
    background: rgba(138, 104, 24, 0.08);
  }
  #shift:hover:not(:disabled) {
    background: rgba(138, 104, 24, 0.14);
    box-shadow: 0 0 24px rgba(138, 104, 24, 0.1);
  }
  #reset { color: var(--slate); }
  #reset:hover:not(:disabled) {
    color: var(--ink);
    background: rgba(255, 255, 255, 0.05);
  }

  .status {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 12px 14px;
    margin-bottom: 16px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--rule-soft);
    font-family: var(--mono);
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .status__pill {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--slate);
    flex-shrink: 0;
  }
  .status.broken .status__pill {
    color: var(--alarm);
    background: rgba(255, 107, 107, 0.12);
  }
  .status.working .status__pill {
    color: var(--moon);
    background: rgba(138, 104, 24, 0.1);
    box-shadow: none;
  }
  .status.done .status__pill {
    color: var(--write);
    background: rgba(95, 210, 154, 0.12);
  }

  .war {
    display: grid;
    grid-template-columns: 1fr 230px;
    min-height: min(620px, 72vh);
    border-radius: var(--radius);
    background: var(--surface);
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      0 0 0 1px rgba(20, 22, 28, 0.1),
      0 24px 60px -36px rgba(20, 22, 28, 0.28);
  }
  .war__chat {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    border-right: 1px solid var(--rule-soft);
  }
  .war__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 18px;
    border-bottom: 1px solid var(--rule-soft);
    background: var(--surface-bar);
  }
  .war__top-left {
    display: flex; align-items: center; gap: 10px; min-width: 0;
  }
  .war__top-left b {
    font-weight: 500; font-size: 14px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .war__live {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--slate);
  }
  .war__live.is-live {
    color: var(--moon);
    background: rgba(138, 104, 24, 0.1);
  }
  .war__live.is-done {
    color: var(--write);
    background: rgba(95, 210, 154, 0.1);
  }
  .war__steps { display: flex; flex-wrap: wrap; gap: 6px; }
  .war__step {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 5px 9px;
    border-radius: 3px;
    color: var(--slate-dim);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    transition: color 200ms ease, border-color 200ms ease, background 200ms ease;
  }
  .war__step.is-on {
    color: var(--moon);
    border-color: rgba(138, 104, 24, 0.35);
    background: rgba(138, 104, 24, 0.08);
    box-shadow: 0 0 18px rgba(138, 104, 24, 0.1);
  }
  .war__step.is-done {
    color: var(--write);
    border-color: rgba(95, 210, 154, 0.3);
    background: rgba(95, 210, 154, 0.08);
  }

  .war__stream {
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scroll-behavior: smooth;
  }
  .msg {
    display: grid;
    grid-template-columns: 108px minmax(0, 1fr);
    column-gap: 14px;
    width: 100%;
    max-width: 100%;
    align-self: stretch;
  }
  .msg__who {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--slate-dim);
    padding-top: 3px;
    text-align: right;
    white-space: nowrap;
  }
  .msg--pager .msg__who { color: var(--alarm); }
  .msg--agent .msg__who { color: var(--moon); }
  .msg--report .msg__who { color: var(--write); }
  .msg--tool .msg__who { color: var(--tool); }
  .msg__body {
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--ink-2);
    white-space: pre-wrap;
  }
  .msg--pager .msg__body,
  .msg--agent .msg__body { color: var(--ink); }
  .msg--report .msg__body {
    color: var(--ink);
    border-left: 2px solid var(--write);
    padding-left: 12px;
  }
  .msg__tool {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 12px;
    padding: 6px 0 6px 12px;
    border-left: 1px solid var(--rule-soft);
    background: transparent;
    font-family: var(--mono);
    font-size: 12.5px;
  }
  .msg__tool-name { color: var(--tool); font-weight: 500; }
  .msg__tool-name.is-memory { color: var(--memory); }
  .msg__tool-name.is-write { color: var(--write); }
  .msg__tool-stamp { color: var(--slate-dim); font-size: 11px; }
  .msg__tool-detail {
    grid-column: 1 / -1;
    color: var(--slate-dim);
    word-break: break-all;
  }

  .war__graph {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--surface-bar);
  }
  .war__graph-head {
    padding: 14px 16px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--slate-dim);
    border-bottom: 1px solid var(--rule-soft);
  }
  .war__aspects {
    list-style: none;
    padding: 10px 0;
    margin: 0;
    flex: 1;
  }
  .war__aspects li {
    display: grid;
    grid-template-columns: 10px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 12px 16px;
    font-family: var(--mono);
    font-size: 12.5px;
    color: var(--slate-dim);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    transition: color 240ms ease, background 240ms ease;
  }
  .war__aspects li i {
    width: 8px; height: 8px; border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    transition: background 240ms ease, box-shadow 240ms ease;
  }
  .war__aspects li b { font-weight: 500; color: var(--slate-dim); }
  .war__aspects li.is-on {
    color: var(--ink);
    background: rgba(255, 255, 255, 0.03);
  }
  .war__aspects li.is-on i {
    background: var(--c, var(--write));
    box-shadow: 0 0 12px color-mix(in srgb, var(--c, #5fd29a) 55%, transparent);
  }
  .war__aspects li.is-on b { color: var(--write); }

  .nights {
    color: var(--slate-dim);
    font-family: var(--mono);
    font-size: 12.5px;
    margin-top: 18px;
  }
  footer {
    margin-top: 10px;
    color: var(--slate-dim);
    font-size: 12.5px;
  }
  a { color: var(--tool); }

  @media (max-width: 860px) {
    .war { grid-template-columns: 1fr; }
    .war__chat { border-right: none; border-bottom: 1px solid var(--rule-soft); }
  }
</style>
</head>
<body>
<div class="shell">
  <p class="where"><b>try.* · judge sandbox</b>
    <span>not /app</span>
    · <a href="https://nightshift.51-91-121-153.sslip.io/">landing</a>
    · <a href="https://nightshift.51-91-121-153.sslip.io/app">war room</a>
    · <a href="https://github.com/Mossab28/nightshift/blob/main/JUDGING.md">JUDGING.md</a>
  </p>
  <div class="brand">
    <h1><span class="moon">&#9789;</span> Nightshift <span class="slash">/ break it yourself</span></h1>
  </div>
  <p class="sub">One-click proof on a real DataHub graph. Break → Wake → Restore.
  The connected product (your token, Sentinel, history) lives at
  <a href="https://nightshift.51-91-121-153.sslip.io/app">/app</a>.</p>

  <div class="controls">
    <button id="break" type="button">Break the pipeline</button>
    <button id="shift" type="button" disabled>Wake the night shift</button>
    <button id="reset" type="button">Restore the schema</button>
  </div>

  <div id="status" class="status">
    <span class="status__pill" id="status-pill">healthy</span>
    <span id="status-text">The pipeline is healthy. Nobody expects anything.</span>
  </div>

  <div class="war" id="war">
    <div class="war__chat">
      <header class="war__top">
        <div class="war__top-left">
          <span class="war__live" id="war-live">idle</span>
          <b id="war-title">Night shift · demo</b>
        </div>
        <div class="war__steps" id="war-steps">
          <span class="war__step" data-step="recall">Recall</span>
          <span class="war__step" data-step="lineage">Lineage</span>
          <span class="war__step" data-step="diagnose">Diagnose</span>
          <span class="war__step" data-step="remember">Remember</span>
          <span class="war__step" data-step="fix">Fix</span>
        </div>
      </header>
      <div class="war__stream" id="stream" aria-live="polite"></div>
    </div>
    <aside class="war__graph" aria-label="DataHub write-back">
      <div class="war__graph-head">DataHub · write-back</div>
      <ul class="war__aspects" id="aspects">
        <li data-aspect="recall"><i style="--c:var(--memory)"></i><span>Memory read</span><b>—</b></li>
        <li data-aspect="incident"><i style="--c:var(--alarm)"></i><span>Incident</span><b>—</b></li>
        <li data-aspect="memory"><i style="--c:var(--moon)"></i><span>Postmortem</span><b>—</b></li>
        <li data-aspect="guard"><i style="--c:var(--write)"></i><span>Presence guard</span><b>—</b></li>
        <li data-aspect="pr"><i style="--c:var(--tool)"></i><span>Draft PR</span><b>—</b></li>
      </ul>
    </aside>
  </div>

  <div class="nights" id="nights"></div>
  <footer>Every conclusion is written into the graph itself.
  Open the <a href="/datahub" target="_blank" rel="noopener">DataHub UI</a> and look at the
  dataset's documentation, validations and incidents.</footer>
</div>
<script>
const $ = id => document.getElementById(id);

const classify = ev => {
  if (ev.kind === "thought") return "thought";
  const l = (ev.label || "").toLowerCase();
  if (l.includes("recall") || l.includes("failure_mode") || l.includes("remember_incident")) return "memory";
  if (l.includes("remember") || l.includes("incident") || l.includes("guard") || l.includes("immunize") || l.includes("open_fix")) return "write";
  return "tool";
};

const stepFor = (label, kind) => {
  const l = (label || "").toLowerCase();
  if (l.includes("recall") || l.includes("failure_mode")) return "recall";
  if (l.includes("lineage") || l.includes("schema") || l.includes("get_entities") || l.includes("dataset_queries")) return "lineage";
  if (l.includes("open_incident") || kind === "thought") return "diagnose";
  if (l.includes("remember") || l.includes("guard") || l.includes("immunize") || l.includes("resolve")) return "remember";
  if (l.includes("open_fix_pr") || l.includes("fix")) return "fix";
  return null;
};

const aspectFor = label => {
  const l = (label || "").toLowerCase();
  if (l.includes("open_incident") || l.includes("resolve_incident")) return "incident";
  if (l.includes("remember_incident")) return "memory";
  if (l.includes("guard_column") || l.includes("immunize")) return "guard";
  if (l.includes("open_fix_pr")) return "pr";
  if (l.includes("recall") || l.includes("failure_mode")) return "recall";
  return null;
};

const lit = new Set();
let lastSig = "";

function resetChrome() {
  lit.clear();
  $("stream").innerHTML = "";
  $("war-steps").querySelectorAll(".war__step").forEach(el => {
    el.classList.remove("is-on", "is-done");
  });
  $("aspects").querySelectorAll("li").forEach(li => {
    li.classList.remove("is-on");
    li.querySelector("b").textContent = "—";
  });
}

function setStep(name) {
  if (!name) return;
  let hit = false;
  $("war-steps").querySelectorAll(".war__step").forEach(el => {
    const id = el.getAttribute("data-step");
    el.classList.remove("is-on");
    if (id === name) {
      el.classList.add("is-on", "is-done");
      hit = true;
    } else if (!hit) {
      el.classList.add("is-done");
    }
  });
}

function lightAspect(key) {
  if (!key || lit.has(key)) return;
  lit.add(key);
  const li = $("aspects").querySelector(`[data-aspect="${key}"]`);
  if (!li) return;
  li.classList.add("is-on");
  li.querySelector("b").textContent = key === "recall" ? "read" : "written";
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pagerText(planted) {
  return planted.symptom ||
    (`${planted.old_column} became ${planted.new_column} upstream. Downstream still selects the old name.`);
}

function renderStream(s) {
  const stream = $("stream");
  const parts = [];

  if (s.planted) {
    parts.push(
      `<div class="msg msg--pager">` +
      `<div class="msg__who">pager</div>` +
      `<div class="msg__body">${esc(pagerText(s.planted))}</div></div>`
    );
  }

  (s.events || []).forEach(ev => {
    const css = classify(ev);
    const stamp = (ev.at || "").split("T").pop() || "";
    const label = ev.label || (css === "thought" ? "thinking" : "");
    const step = stepFor(label, ev.kind);
    if (step) setStep(step);
    const aspect = aspectFor(label);
    if (aspect) lightAspect(aspect);

    if (css === "thought") {
      parts.push(
        `<div class="msg msg--agent">` +
        `<div class="msg__who">nightshift</div>` +
        `<div class="msg__body">${esc(ev.detail || "")}<div style="opacity:.45;font:11px var(--mono);margin-top:4px">${esc(stamp)}</div></div></div>`
      );
    } else {
      const tone = css === "memory" ? "is-memory" : css === "write" ? "is-write" : "";
      parts.push(
        `<div class="msg msg--tool">` +
        `<div class="msg__who">tool</div>` +
        `<div class="msg__tool">` +
        `<span class="msg__tool-name ${tone}">${esc(label)}</span>` +
        `<span class="msg__tool-stamp">${esc(stamp)}</span>` +
        `<span class="msg__tool-detail">${esc(ev.detail || "")}</span>` +
        `</div></div>`
      );
    }
  });

  if (s.conclusion) {
    parts.push(
      `<div class="msg msg--report">` +
      `<div class="msg__who">report</div>` +
      `<div class="msg__body">${esc(s.conclusion)}</div></div>`
    );
    setStep("fix");
  }

  stream.innerHTML = parts.join("");
  stream.scrollTop = stream.scrollHeight;
}

async function poll() {
  const s = await (await fetch("/api/state")).json();
  $("break").disabled = !!s.planted || s.shift_running;
  $("shift").disabled = !s.planted || s.shift_running;

  const st = $("status");
  const pill = $("status-pill");
  const text = $("status-text");
  const live = $("war-live");
  const title = $("war-title");

  if (s.shift_running) {
    st.className = "status working";
    pill.textContent = "running";
    text.textContent = "The night shift is working. Watch the conversation.";
    live.className = "war__live is-live";
    live.textContent = "live";
    title.textContent = "Night shift · working";
  } else if (s.conclusion) {
    st.className = "status done";
    pill.textContent = "done";
    text.textContent = "Shift over. Read the morning report, then check DataHub.";
    live.className = "war__live is-done";
    live.textContent = "done";
    title.textContent = "Night shift · morning";
  } else if (s.planted) {
    st.className = "status broken";
    pill.textContent = "planted";
    text.textContent = "`" + s.planted.old_column + "` is now `" + s.planted.new_column +
      "` upstream. Downstream SQL still selects the old name. Nobody was told.";
    live.className = "war__live";
    live.textContent = "planted";
    title.textContent = "Night shift · waiting";
  } else {
    st.className = "status";
    pill.textContent = "healthy";
    text.textContent = "The pipeline is healthy. Nobody expects anything.";
    live.className = "war__live";
    live.textContent = "idle";
    title.textContent = "Night shift · demo";
  }

  const sig = s.events.length + "|" + (s.conclusion ? "1" : "0") + "|" + (s.planted ? "1" : "0") + "|" + (s.shift_running ? "1" : "0");
  if (sig !== lastSig) {
    lastSig = sig;
    if (!s.planted && !s.events.length && !s.conclusion) {
      resetChrome();
    } else {
      /* Re-light steps/aspects from scratch each paint. */
      lit.clear();
      $("war-steps").querySelectorAll(".war__step").forEach(el => {
        el.classList.remove("is-on", "is-done");
      });
      $("aspects").querySelectorAll("li").forEach(li => {
        li.classList.remove("is-on");
        li.querySelector("b").textContent = "—";
      });
      renderStream(s);
    }
  }

  $("nights").textContent = s.nights
    ? `${s.nights} shift(s) this session - the graph remembers every one.`
    : "";
}

$("break").onclick = async () => {
  await fetch("/api/break", { method: "POST" });
  poll();
};
$("shift").onclick = async () => {
  await fetch("/api/shift", { method: "POST" });
  poll();
};
$("reset").onclick = async () => {
  await fetch("/api/reset", { method: "POST" });
  lastSig = "";
  resetChrome();
  poll();
};
setInterval(poll, 1500);
poll();
</script>
</body>
</html>
"""
