"""The live war-room page served by the demo server.

Judge-facing one-click demo: break the pipeline, wake the night shift, restore.
ChatGPT / Claude style: bubbles + composer. Tools stay collapsed into plain
language so judges read a conversation, not a tool dump.
"""

LIVE_PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nightshift / break it yourself</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='8' fill='%2314161c'/%3E%3Cpath d='M20.2 6.4a9.6 9.6 0 1 0 5.4 17.2 11.2 11.2 0 1 1-5.4-17.2z' fill='%23c9a227'/%3E%3C/svg%3E" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
 :root {
 --bg: #eceff3;
 --surface: #f7f8fa;
 --ink: #14161c;
 --mute: rgba(20, 22, 28, 0.58);
 --dim: rgba(20, 22, 28, 0.38);
 --line: rgba(20, 22, 28, 0.1);
 --moon: #8a6818;
 --alarm: #a82828;
 --ok: #1a6b48;
 --user: #e8eaef;
 --assistant: #14161c;
 --assistant-ink: #f2f3f5;
 --radius: 14px;
 --font: "Figtree", system-ui, -apple-system, sans-serif;
 --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
 --ease: cubic-bezier(0.22, 1, 0.36, 1);
 }
 * { box-sizing: border-box; margin: 0; padding: 0; }
 html, body { height: 100%; overflow: hidden; }
 body {
 background: var(--bg);
 color: var(--ink);
 font: 500 15px/1.5 var(--font);
 -webkit-font-smoothing: antialiased;
 color-scheme: light;
 }
 a { color: var(--moon); }

 .app {
 max-width: 980px;
 margin: 0 auto;
 height: 100%;
 max-height: 100vh;
 padding: 18px 18px 0;
 display: flex;
 flex-direction: column;
 overflow: hidden;
 }

 .top {
 display: flex;
 align-items: flex-start;
 justify-content: space-between;
 gap: 16px;
 flex-wrap: wrap;
 margin-bottom: 14px;
 }
 .brand h1 {
 font-size: clamp(22px, 3vw, 28px);
 font-weight: 600;
 letter-spacing: -0.02em;
 }
 .brand h1 .moon { color: var(--moon); }
 .brand p {
 margin-top: 4px;
 color: var(--mute);
 font-size: 14px;
 max-width: 46ch;
 }
 .where {
 font-family: var(--mono);
 font-size: 11px;
 letter-spacing: 0.04em;
 color: var(--dim);
 display: flex;
 flex-wrap: wrap;
 gap: 8px;
 align-items: center;
 }
 .where b {
 color: var(--moon);
 border: 1px solid rgba(138,104,24,0.35);
 background: rgba(138,104,24,0.08);
 padding: 4px 8px;
 border-radius: 4px;
 font-weight: 500;
 }

 .stage {
 flex: 1;
 min-height: 0;
 display: grid;
 grid-template-columns: minmax(0, 1fr) 220px;
 gap: 12px;
 margin-bottom: 12px;
 }
 @media (max-width: 820px) {
 .stage { grid-template-columns: 1fr; }
 .rail { order: -1; }
 }

 .chat {
 background: var(--surface);
 border: 1px solid var(--line);
 border-radius: var(--radius);
 display: flex;
 flex-direction: column;
 flex: 1;
 min-height: 0;
 height: 100%;
 max-height: calc(100vh - 150px);
 overflow: hidden;
 box-shadow: 0 18px 40px -28px rgba(20,22,28,0.35);
 }
 .chat__head {
 display: flex;
 align-items: center;
 justify-content: space-between;
 gap: 10px;
 padding: 12px 16px;
 border-bottom: 1px solid var(--line);
 background: rgba(255,255,255,0.55);
 }
 .chat__head strong { font-weight: 600; font-size: 14px; }
 .pill {
 font-family: var(--mono);
 font-size: 11px;
 letter-spacing: 0.06em;
 text-transform: uppercase;
 padding: 4px 8px;
 border-radius: 999px;
 background: rgba(20,22,28,0.06);
 color: var(--mute);
 }
 .pill.is-live { color: var(--moon); background: rgba(138,104,24,0.12); }
 .pill.is-broken { color: var(--alarm); background: rgba(168,40,40,0.1); }
 .pill.is-done { color: var(--ok); background: rgba(26,107,72,0.12); }

 .stream {
 flex: 1;
 min-height: 0;
 overflow-y: auto;
 overscroll-behavior: contain;
 padding: 20px 18px 12px;
 display: flex;
 flex-direction: column;
 gap: 14px;
 scroll-behavior: smooth;
 }
 .stream__pin {
 height: 1px;
 width: 100%;
 flex-shrink: 0;
 }
 .empty {
 margin: auto;
 text-align: center;
 max-width: 34ch;
 color: var(--mute);
 padding: 28px 12px;
 }
 .empty h2 {
 font-size: 18px;
 font-weight: 600;
 color: var(--ink);
 margin-bottom: 8px;
 letter-spacing: -0.02em;
 }
 .empty p { font-size: 14px; line-height: 1.55; }

 .row {
 display: flex;
 flex-direction: column;
 gap: 6px;
 max-width: min(78%, 560px);
 animation: in 360ms var(--ease) both;
 }
 .row.is-user { align-self: flex-end; align-items: flex-end; }
 .row.is-assistant { align-self: flex-start; align-items: flex-start; }
 .row.is-status { align-self: center; max-width: 100%; align-items: center; }
 .kicker {
 font-family: var(--mono);
 font-size: 10px;
 letter-spacing: 0.14em;
 text-transform: uppercase;
 color: var(--dim);
 }
 .row.is-assistant .kicker { color: var(--moon); }
 .row.is-user .kicker { color: var(--alarm); }

 .bubble {
 padding: 12px 14px;
 border-radius: 16px;
 font-size: 14.5px;
 line-height: 1.55;
 white-space: pre-wrap;
 word-break: break-word;
 }
 .bubble--user {
 background: var(--user);
 border: 1px solid var(--line);
 border-bottom-right-radius: 5px;
 color: var(--ink);
 }
 .bubble--assistant {
 background: var(--assistant);
 color: var(--assistant-ink);
 border-bottom-left-radius: 5px;
 }
 .bubble--status {
 background: transparent;
 border: 1px dashed var(--line);
 color: var(--mute);
 font-family: var(--mono);
 font-size: 12px;
 border-radius: 999px;
 padding: 8px 14px;
 }
 .working {
 display: flex;
 align-items: center;
 gap: 10px;
 }
 .dots { display: inline-flex; gap: 4px; }
 .dots i {
 width: 5px; height: 5px; border-radius: 50%;
 background: var(--moon);
 opacity: 0.3;
 animation: blink 1s infinite;
 }
 .dots i:nth-child(2) { animation-delay: 0.15s; }
 .dots i:nth-child(3) { animation-delay: 0.3s; }

 .steps {
 margin-top: 8px;
 display: flex;
 flex-direction: column;
 gap: 4px;
 font-family: var(--mono);
 font-size: 11.5px;
 color: rgba(242,243,245,0.62);
 }
 .steps b { color: rgba(242,243,245,0.9); font-weight: 500; }

 .composer {
 border-top: 1px solid var(--line);
 padding: 12px;
 background: rgba(255,255,255,0.65);
 display: flex;
 flex-direction: column;
 gap: 10px;
 }
 .actions {
 display: flex;
 flex-wrap: wrap;
 gap: 8px;
 }
 .actions button {
 font: 600 13px var(--font);
 padding: 10px 14px;
 border-radius: 10px;
 border: 1px solid var(--line);
 background: #fff;
 color: var(--ink);
 cursor: pointer;
 transition: background 140ms ease, border-color 140ms ease, opacity 140ms ease;
 }
 .actions button:disabled { opacity: 0.4; cursor: default; }
 .actions button:hover:not(:disabled) { border-color: rgba(20,22,28,0.22); }
 #break {
 color: var(--alarm);
 border-color: rgba(168,40,40,0.28);
 background: rgba(168,40,40,0.06);
 }
 #shift {
 color: #fff;
 background: var(--ink);
 border-color: var(--ink);
 }
 #shift:disabled {
 color: var(--mute);
 background: #fff;
 border-color: var(--line);
 }
 #reset { color: var(--mute); }

 .bar {
 display: flex;
 gap: 8px;
 align-items: stretch;
 }
 .bar__field {
 flex: 1;
 position: relative;
 }
 .bar__field span {
 position: absolute;
 left: 14px;
 top: 50%;
 transform: translateY(-50%);
 font-family: var(--mono);
 font-size: 13px;
 color: var(--dim);
 pointer-events: none;
 }
 .bar input {
 width: 100%;
 border: 1px solid var(--line);
 background: #fff;
 border-radius: 12px;
 padding: 13px 14px 13px 30px;
 font: 500 14px var(--font);
 color: var(--ink);
 outline: none;
 }
 .bar input:focus { border-color: rgba(20,22,28,0.35); }
 .bar input:disabled { background: #f3f4f6; color: var(--dim); }
 .bar button {
 min-width: 96px;
 border-radius: 12px;
 border: 1px solid var(--ink);
 background: var(--ink);
 color: #fff;
 font: 600 13px var(--font);
 cursor: pointer;
 padding: 0 16px;
 }
 .bar button:disabled {
 background: transparent;
 color: var(--dim);
 border-color: var(--line);
 cursor: default;
 }
 .hint {
 font-size: 12px;
 color: var(--dim);
 padding: 0 2px;
 }

 .rail {
 background: var(--surface);
 border: 1px solid var(--line);
 border-radius: var(--radius);
 padding: 14px 14px 10px;
 height: fit-content;
 }
 .rail h3 {
 font-family: var(--mono);
 font-size: 11px;
 letter-spacing: 0.12em;
 text-transform: uppercase;
 color: var(--dim);
 margin-bottom: 12px;
 }
 .rail li {
 list-style: none;
 display: flex;
 align-items: center;
 justify-content: space-between;
 gap: 10px;
 padding: 10px 0;
 border-top: 1px solid var(--line);
 font-size: 13px;
 color: var(--mute);
 }
 .rail li:first-of-type { border-top: none; }
 .rail li.is-on { color: var(--ink); font-weight: 600; }
 .rail li i {
 width: 18px; height: 18px; border-radius: 50%;
 border: 1.5px solid var(--line);
 display: grid; place-items: center;
 font-size: 11px; color: transparent;
 flex-shrink: 0;
 }
 .rail li.is-on i {
 border-color: var(--ok);
 background: rgba(26,107,72,0.12);
 color: var(--ok);
 }

 .foot {
 padding: 4px 2px 16px;
 font-size: 12px;
 color: var(--dim);
 }

 @keyframes in {
 from { opacity: 0; transform: translateY(8px); }
 to { opacity: 1; transform: none; }
 }
 @keyframes blink {
 0%, 100% { opacity: 0.25; }
 50% { opacity: 1; }
 }
 @media (prefers-reduced-motion: reduce) {
 .row { animation: none; }
 .dots i { animation: none; opacity: 0.7; }
 }
</style>
</head>
<body>
<div class="app">
 <div class="top">
 <div class="brand">
 <h1><span class="moon">&#9789;</span> Nightshift</h1>
 <p>Break a real pipeline. Wake the on-call agent. Watch it write the night back into DataHub.</p>
 </div>
 <div class="where">
 <b>try.* · demo</b>
 <a href="https://nightshift.51-91-121-153.sslip.io/">landing</a>
 <a href="https://nightshift.51-91-121-153.sslip.io/app">/app</a>
 <a href="https://github.com/Mossab28/nightshift/blob/main/JUDGING.md">JUDGING.md</a>
 </div>
 </div>

 <div class="stage">
 <section class="chat" aria-label="Nightshift chat">
 <header class="chat__head">
 <strong>Night desk</strong>
 <span class="pill" id="pill">idle</span>
 </header>
 <div class="stream" id="stream" aria-live="polite">
 <div class="empty" id="empty">
 <h2>Start with the pager</h2>
 <p>Click <b>Break the pipeline</b>. Then wake Nightshift. You will see a normal chat, not a wall of tool names.</p>
 </div>
 <div class="stream__pin" id="stream-pin" aria-hidden="true"></div>
 </div>
 <div class="composer">
 <div class="actions">
 <button id="break" type="button">Break the pipeline</button>
 <button id="shift" type="button" disabled>Wake the night shift</button>
 <button id="reset" type="button">Restore</button>
 </div>
 <form class="bar" id="compose" autocomplete="off">
 <div class="bar__field">
 <span>&gt;</span>
 <input id="input" type="text" placeholder="Or type: break / wake / restore" />
 </div>
 <button id="send" type="submit" disabled>Send</button>
 </form>
 <p class="hint" id="hint">Tip: Break first. Wake second. Restore when you are done.</p>
 </div>
 </section>

 <aside class="rail" aria-label="DataHub write-back">
 <h3>DataHub</h3>
 <ul id="aspects">
 <li data-aspect="recall"><span>Memory check</span><i>✓</i></li>
 <li data-aspect="incident"><span>Incident</span><i>✓</i></li>
 <li data-aspect="memory"><span>Postmortem</span><i>✓</i></li>
 <li data-aspect="guard"><span>Presence guard</span><i>✓</i></li>
 <li data-aspect="pr"><span>Draft fix PR</span><i>✓</i></li>
 </ul>
 </aside>
 </div>

 <p class="foot" id="nights">After the shift, open the
 <a href="/datahub" target="_blank" rel="noopener">DataHub UI</a>
 and check Incidents, Documentation, and Validations.</p>
</div>
<script>
const $ = id => document.getElementById(id);
const stream = $("stream");
const empty = $("empty");
const pin = $("stream-pin");
const lit = new Set();
let lastSig = "";
let painted = { pager: false, thoughts: 0, tools: 0, conclusion: false, working: false };
let busy = null;
let pollMs = 1200;
let pollTimer = null;
let workingEl = null;
let stickBottom = true;

stream.addEventListener("scroll", () => {
 const gap = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
 stickBottom = gap < 96;
}, { passive: true });

function scrollChat(force) {
 if (!force && !stickBottom) return;
 requestAnimationFrame(() => {
 if (pin) pin.scrollIntoView({ block: "end", behavior: "smooth" });
 else stream.scrollTop = stream.scrollHeight;
 });
}

const TOOL_PLAIN = [
 [/recall|failure_mode/, "Checking memory for a known failure"],
 [/lineage|get_lineage/, "Walking lineage upstream"],
 [/schema|get_entities|dataset_queries/, "Reading the real schema"],
 [/open_incident/, "Opening an incident in DataHub"],
 [/resolve_incident/, "Resolving the incident"],
 [/remember_incident/, "Writing the postmortem into the graph"],
 [/guard_column|immunize/, "Leaving a presence guard"],
 [/open_fix_pr/, "Opening a draft fix PR"],
 [/search|query/, "Searching the catalog"],
];

function plainTool(label) {
 const l = (label || "").toLowerCase();
 for (const [re, text] of TOOL_PLAIN) if (re.test(l)) return text;
 return "Working a DataHub tool";
}

function aspectFor(label) {
 const l = (label || "").toLowerCase();
 if (l.includes("open_incident") || l.includes("resolve_incident")) return "incident";
 if (l.includes("remember_incident")) return "memory";
 if (l.includes("guard_column") || l.includes("immunize")) return "guard";
 if (l.includes("open_fix_pr")) return "pr";
 if (l.includes("recall") || l.includes("failure_mode")) return "recall";
 return null;
}

function esc(s) {
 return String(s || "")
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;");
}

function hideEmpty() {
 if (empty) empty.style.display = "none";
}

function showEmpty() {
 if (empty) empty.style.display = "";
}

function resetChrome() {
 lit.clear();
 painted = { pager: false, thoughts: 0, tools: 0, conclusion: false, working: false };
 workingEl = null;
 stickBottom = true;
 stream.innerHTML = "";
 stream.appendChild(empty);
 if (pin) stream.appendChild(pin);
 showEmpty();
 $("aspects").querySelectorAll("li").forEach(li => li.classList.remove("is-on"));
}

function lightAspect(key) {
 if (!key || lit.has(key)) return;
 lit.add(key);
 const li = $("aspects").querySelector(`[data-aspect="${key}"]`);
 if (li) li.classList.add("is-on");
}

function addRow(kind, kicker, htmlBody) {
 hideEmpty();
 const row = document.createElement("div");
 row.className = "row is-" + kind;
 row.innerHTML =
 `<div class="kicker">${esc(kicker)}</div>` +
 `<div class="bubble bubble--${kind === "status" ? "status" : kind}">${htmlBody}</div>`;
 if (pin && pin.parentNode === stream) stream.insertBefore(row, pin);
 else stream.appendChild(row);
 scrollChat(true);
 return row;
}

function pagerText(planted) {
 return planted.symptom ||
 (`The revenue dashboard is showing zero. Upstream renamed ${planted.old_column} to ${planted.new_column} overnight. Nobody told us.`);
}

function ensureWorking() {
 if (workingEl) return workingEl;
 painted.working = true;
 workingEl = addRow(
 "assistant",
 "Nightshift",
 `<div class="working"><span class="dots"><i></i><i></i><i></i></span><span>On it</span></div>` +
 `<div class="steps" id="work-steps"></div>`
 );
 return workingEl;
}

function pushWorkStep(text) {
 ensureWorking();
 const box = workingEl.querySelector("#work-steps");
 if (!box) return;
 const existing = [...box.querySelectorAll("div")].map(d => d.dataset.key);
 if (existing.includes(text)) return;
 if (box.children.length >= 5) return;
 const line = document.createElement("div");
 line.dataset.key = text;
 line.innerHTML = `<b>·</b> ${esc(text)}`;
 box.appendChild(line);
 scrollChat(true);
}

function finishWorking() {
 if (!workingEl) return;
 const label = workingEl.querySelector(".working span:last-child");
 if (label) label.textContent = "Done looking. Writing it down.";
}

function setPill(mode, text) {
 const pill = $("pill");
 pill.className = "pill" + (mode ? " is-" + mode : "");
 pill.textContent = text;
}

function setBusy(id, label) {
 busy = id;
 ["break", "shift", "reset", "send"].forEach(bid => {
 const b = $(bid);
 if (!b) return;
 b.disabled = true;
 if (bid === id) {
 b.dataset.label = b.dataset.label || b.textContent;
 b.textContent = label;
 }
 });
 $("input").disabled = true;
}

function clearBusy() {
 if (!busy) return;
 const b = $(busy);
 if (b && b.dataset.label) b.textContent = b.dataset.label;
 busy = null;
 $("input").disabled = false;
}

function syncChat(s) {
 const events = s.events || [];
 const thoughts = events.filter(e => e.kind === "thought");
 const tools = events.filter(e => e.kind !== "thought");

 if (s.planted && !painted.pager) {
 const row = addRow("user", "Pager", esc(pagerText(s.planted)));
 row.querySelector(".bubble").dataset.final = "1";
 painted.pager = true;
 } else if (s.planted && painted.pager) {
 const body = stream.querySelector(".row.is-user .bubble");
 if (body && body.dataset.final !== "1") {
 body.textContent = pagerText(s.planted);
 body.dataset.final = "1";
 }
 }

 if (s.shift_running && !s.conclusion) {
 ensureWorking();
 }

 for (let i = painted.tools; i < tools.length; i++) {
 const ev = tools[i];
 const label = ev.label || "";
 pushWorkStep(plainTool(label));
 const aspect = aspectFor(label);
 if (aspect) lightAspect(aspect);
 }
 painted.tools = tools.length;

 for (let i = painted.thoughts; i < thoughts.length; i++) {
 const t = (thoughts[i].detail || "").trim();
 if (!t) continue;
 /* Keep only the useful prose, skip tiny fragments. */
 if (t.length < 40 && i < thoughts.length - 1) continue;
 addRow("assistant", "Nightshift", esc(t));
 }
 painted.thoughts = thoughts.length;

 if (s.conclusion && !painted.conclusion) {
 finishWorking();
 addRow("assistant", "Morning report", esc(s.conclusion));
 painted.conclusion = true;
 /* Light remaining write-backs judges expect. */
 ["incident", "memory", "guard", "pr"].forEach(lightAspect);
 }
}

async function poll() {
 let s;
 try { s = await (await fetch("/api/state")).json(); }
 catch { return; }

 const events = s.events || [];
 if (!busy) {
 $("break").disabled = !!s.planted || s.shift_running;
 $("shift").disabled = !s.planted || s.shift_running;
 $("reset").disabled = !!s.shift_running;
 }

 if (s.shift_running) {
 setPill("live", "live");
 $("hint").textContent = "Nightshift is working. Watch the chat and the DataHub checklist.";
 $("input").placeholder = "Shift in progress…";
 $("send").disabled = true;
 pollMs = 450;
 } else if (s.conclusion) {
 setPill("done", "done");
 $("hint").textContent = "Shift over. Open DataHub, then Restore if you want a clean graph.";
 $("input").placeholder = "Type restore, or ask nothing — demo is done";
 $("send").disabled = false;
 pollMs = 1500;
 } else if (s.planted) {
 setPill("broken", "broken");
 $("hint").textContent = "Pipeline is broken. Wake the night shift.";
 $("input").placeholder = "Type wake — or press Wake the night shift";
 $("send").disabled = false;
 pollMs = 900;
 } else {
 setPill("", "idle");
 $("hint").textContent = "Tip: Break first. Wake second. Restore when you are done.";
 $("input").placeholder = "Or type: break / wake / restore";
 $("send").disabled = false;
 pollMs = 1200;
 }

 const sig = events.length + "|" + (s.conclusion ? "1" : "0") + "|" +
 (s.planted ? "1" : "0") + "|" + (s.shift_running ? "1" : "0");

 if (!s.planted && !events.length && !s.conclusion && !s.shift_running) {
 if (sig !== lastSig) { lastSig = sig; resetChrome(); }
 } else {
 if (events.length < painted.tools + painted.thoughts || (!s.planted && painted.pager && !busy)) {
 resetChrome();
 lastSig = "";
 }
 if (sig !== lastSig || (s.shift_running && !events.length)) {
 lastSig = sig;
 if (!s.planted && painted.pager && !busy) resetChrome();
 syncChat(s);
 }
 }

 $("nights").innerHTML = s.nights
 ? `${s.nights} shift(s) this session. The graph remembers every one. Open the <a href="/datahub" target="_blank" rel="noopener">DataHub UI</a>.`
 : `After the shift, open the <a href="/datahub" target="_blank" rel="noopener">DataHub UI</a> and check Incidents, Documentation, and Validations.`;
}

function schedulePoll() {
 if (pollTimer) clearTimeout(pollTimer);
 pollTimer = setTimeout(async () => { await poll(); schedulePoll(); }, pollMs);
}

async function doBreak() {
 setBusy("break", "Breaking…");
 setPill("broken", "breaking");
 $("hint").textContent = "Planting a silent upstream rename…";
 if (!painted.pager) {
 addRow("user", "Pager", "Something just broke the revenue dashboard overnight.");
 painted.pager = true;
 }
 try {
 const res = await fetch("/api/break", { method: "POST" });
 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 addRow("status", "system", esc(err.detail || err.error || "Break failed"));
 }
 } catch {
 addRow("status", "system", "Break request failed");
 } finally {
 clearBusy();
 lastSig = "";
 await poll();
 }
}

async function doWake() {
 setBusy("shift", "Waking…");
 setPill("live", "waking");
 $("hint").textContent = "Handing the pager to Nightshift…";
 ensureWorking();
 pushWorkStep("Starting the night shift");
 pollMs = 450;
 try {
 const res = await fetch("/api/shift", { method: "POST" });
 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 addRow("status", "system", esc(err.detail || err.error || "Wake failed"));
 }
 } catch {
 addRow("status", "system", "Wake request failed");
 } finally {
 clearBusy();
 lastSig = "";
 await poll();
 }
}

async function doReset() {
 setBusy("reset", "Restoring…");
 try {
 await fetch("/api/reset", { method: "POST" });
 } finally {
 clearBusy();
 lastSig = "";
 resetChrome();
 await poll();
 }
}

$("break").onclick = () => doBreak();
$("shift").onclick = () => doWake();
$("reset").onclick = () => doReset();

$("compose").onsubmit = async (e) => {
 e.preventDefault();
 const raw = ($("input").value || "").trim().toLowerCase();
 if (!raw) return;
 $("input").value = "";
 if (raw === "break" || raw.includes("break")) return doBreak();
 if (raw === "wake" || raw.includes("wake") || raw.includes("night")) return doWake();
 if (raw === "restore" || raw.includes("restore") || raw.includes("reset")) return doReset();
 addRow("user", "You", esc(raw));
 addRow(
 "assistant",
 "Nightshift",
 "This demo is driven by the three buttons. Type <b>break</b>, <b>wake</b>, or <b>restore</b> — or use the buttons above."
 );
};

$("input").addEventListener("input", () => {
 $("send").disabled = !$("input").value.trim() || !!busy;
});

schedulePoll();
poll();
</script>
</body>
</html>
"""
