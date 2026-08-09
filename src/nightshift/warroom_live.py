"""The live war-room page served by the demo server.

Same night-time design language as the static war room, plus the two buttons
that make the demo yours to run: break the pipeline, wake the night shift.
"""

LIVE_PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nightshift &mdash; break it yourself</title>
<style>
  :root {
    --bg:#0b0e14; --panel:#11151f; --line:#1e2433; --text:#d7dce6; --dim:#6b7385;
    --moon:#ffd76e; --tool:#6ea8ff; --memory:#b98aff; --write:#5fd29a; --alarm:#ff6b6b;
  }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--text);
    font:15px/1.55 "SF Mono",ui-monospace,Menlo,monospace;
    padding:48px 24px; display:flex; justify-content:center; }
  main { max-width:860px; width:100%; }
  h1 { font-size:22px; font-weight:600; letter-spacing:.04em; }
  h1 .moon { color:var(--moon); }
  .sub { color:var(--dim); margin:6px 0 28px; }
  .controls { display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
  button { font:inherit; padding:12px 22px; border-radius:8px; cursor:pointer;
    border:1px solid var(--line); background:var(--panel); color:var(--text); }
  button:disabled { opacity:.4; cursor:default; }
  #break { border-color:var(--alarm); color:var(--alarm); }
  #break:hover:not(:disabled) { background:rgba(255,107,107,.08); }
  #shift { border-color:var(--moon); color:var(--moon); }
  #shift:hover:not(:disabled) { background:rgba(255,215,110,.08); }
  #reset { color:var(--dim); }
  .status { padding:14px 18px; background:var(--panel); border:1px solid var(--line);
    border-radius:8px; margin-bottom:24px; min-height:52px; }
  .status.broken { border-left:3px solid var(--alarm); }
  .status.working { border-left:3px solid var(--moon); }
  .status.done { border-left:3px solid var(--write); }
  .timeline { border-left:1px solid var(--line); margin-left:8px; padding-left:28px; }
  .event { position:relative; margin-bottom:18px; }
  .event::before { content:""; position:absolute; left:-33px; top:6px;
    width:9px; height:9px; border-radius:50%; background:var(--dim); }
  .event.tool::before { background:var(--tool); }
  .event.memory::before { background:var(--memory); box-shadow:0 0 10px var(--memory); }
  .event.write::before { background:var(--write); box-shadow:0 0 10px var(--write); }
  .event .stamp { color:var(--dim); font-size:12px; }
  .event .label { font-weight:600; }
  .event.tool .label { color:var(--tool); }
  .event.memory .label { color:var(--memory); }
  .event.write .label { color:var(--write); }
  .event .detail { color:var(--dim); font-size:13px; word-break:break-all; }
  .event.thought .detail { color:var(--text); background:var(--panel);
    border:1px solid var(--line); border-radius:8px; padding:12px 16px;
    margin-top:6px; white-space:pre-wrap; word-break:normal; font-size:13.5px; }
  .conclusion { margin-top:30px; padding:20px 24px; background:var(--panel);
    border:1px solid var(--line); border-left:3px solid var(--write);
    border-radius:8px; white-space:pre-wrap; display:none; }
  .conclusion .label { color:var(--write); font-size:12px; letter-spacing:.12em; }
  .nights { color:var(--dim); font-size:13px; margin-top:30px; }
  footer { margin-top:16px; color:var(--dim); font-size:12px; }
  a { color:var(--tool); }
</style>
</head>
<body>
<main>
  <h1><span class="moon">&#9789;</span> NIGHTSHIFT <span style="color:var(--dim)">/ break it yourself</span></h1>
  <p class="sub">A real DataHub graph. A real agent. Rename a column upstream, tell nobody,
  and watch the night shift find it &mdash; or remember it.</p>

  <div class="controls">
    <button id="break">break the pipeline</button>
    <button id="shift" disabled>wake the night shift</button>
    <button id="reset">restore the schema</button>
  </div>

  <div id="status" class="status">The pipeline is healthy. Nobody expects anything.</div>
  <div id="timeline" class="timeline"></div>
  <div id="conclusion" class="conclusion">
    <div class="label">MORNING REPORT</div>
    <div id="conclusion-text"></div>
  </div>
  <div class="nights" id="nights"></div>
  <footer>Every conclusion is written into the graph itself &mdash;
  open the <a href="/datahub" target="_blank">DataHub UI</a> and look at the
  dataset&rsquo;s documentation, validations and incidents.</footer>
</main>
<script>
const $ = id => document.getElementById(id);
const classify = ev => {
  if (ev.kind === "thought") return "thought";
  const l = ev.label || "";
  if (l.includes("recall") || l.includes("failure_mode")) return "memory";
  if (l.includes("remember") || l.includes("incident") || l.includes("guard")) return "write";
  return "tool";
};
let lastCount = -1;
async function poll() {
  const s = await (await fetch("/api/state")).json();
  $("break").disabled = !!s.planted || s.shift_running;
  $("shift").disabled = !s.planted || s.shift_running;
  const st = $("status");
  if (s.shift_running) {
    st.className = "status working";
    st.textContent = "The night shift is working. Watch the timeline.";
  } else if (s.conclusion) {
    st.className = "status done";
    st.textContent = "Shift over. Read the morning report below — then check DataHub.";
  } else if (s.planted) {
    st.className = "status broken";
    st.textContent = "`" + s.planted.old_column + "` is now `" + s.planted.new_column +
      "` upstream. Downstream SQL still selects the old name. Nobody was told.";
  } else {
    st.className = "status";
    st.textContent = "The pipeline is healthy. Nobody expects anything.";
  }
  if (s.events.length !== lastCount) {
    lastCount = s.events.length;
    $("timeline").innerHTML = s.events.map(ev => {
      const css = classify(ev);
      const stamp = (ev.at || "").split("T").pop();
      const label = ev.label || (css === "thought" ? "—" : "");
      return `<div class="event ${css}"><span class="stamp">${stamp}</span> ` +
        `<span class="label">${label}</span><div class="detail"></div></div>`;
    }).join("");
    [...$("timeline").querySelectorAll(".event .detail")].forEach((el, i) => {
      el.textContent = s.events[i].detail || "";
    });
  }
  $("conclusion").style.display = s.conclusion ? "block" : "none";
  $("conclusion-text").textContent = s.conclusion;
  $("nights").textContent = s.nights
    ? `${s.nights} shift(s) this session — the graph remembers every one.` : "";
}
$("break").onclick = async () => { await fetch("/api/break", {method:"POST"}); poll(); };
$("shift").onclick = async () => { await fetch("/api/shift", {method:"POST"}); poll(); };
$("reset").onclick = async () => { await fetch("/api/reset", {method:"POST"}); lastCount=-1; poll(); };
setInterval(poll, 1500); poll();
</script>
</body>
</html>
"""
