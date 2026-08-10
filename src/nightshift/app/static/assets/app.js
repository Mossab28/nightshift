/* Nightshift SPA - vanilla JS, hash routing, no dependencies. */
"use strict";

const app = typeof document === "undefined" ? null : document.getElementById("app");

const state = {
 email: null,
 workspaces: [],
 wsId: null,
 pollTimer: null,
};

/* ------------------------------------------------------------------- api */

async function api(path, opts = {}) {
 const res = await fetch("/api" + path, {
 headers: opts.body ? { "Content-Type": "application/json" } : {},
 method: opts.method || (opts.body ? "POST" : "GET"),
 body: opts.body ? JSON.stringify(opts.body) : undefined,
 });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) {
 const err = new Error(typeof data.detail === "string" ? data.detail : res.statusText);
 err.status = res.status;
 throw err;
 }
 return data;
}

/* ----------------------------------------------------------------- utils */

function el(html) {
 const t = document.createElement("template");
 t.innerHTML = html.trim();
 return t.content.firstElementChild;
}

function esc(s) {
 return String(s == null ? "" : s)
 .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
 .replaceAll('"', "&quot;");
}

function fmtWhen(iso) {
 if (!iso) return "";
 const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
 if (isNaN(d)) return iso;
 return d.toLocaleString("en-GB", {
 month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
 });
}

function stopPolling() {
 if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
}

/* --------------------------------------------------------------- classify */

function classify(ev) {
 if (ev.kind === "thought") return "thought";
 const l = ev.label || "";
 if (l.includes("recall") || l.includes("failure_mode")) return "memory";
 if (l.includes("remember") || l.includes("incident") || l.includes("guard")) return "write";
 return "tool";
}

/* ------------------------------------------------------------------ shell */

function shell(active, contentNode, opts = {}) {
 const nav = [
 ["#/", "Dashboard", "dashboard", "nav-dashboard"],
 ["#/live", "Live", "live", "nav-live"],
 ["#/shifts", "Shifts", "shifts", "nav-shifts"],
 ["#/memory", "Memory", "memory", "nav-memory"],
 ["#/settings", "Settings", "settings", "nav-settings"],
 ];
 const desk = !!opts.desk;
 const root = el(`
 <div class="shell-root${desk ? " shell-root--desk" : ""}">
 <header class="topbar">
 <a href="/" class="wordmark"><span class="moon">&#9789;</span>Nightshift</a>
 ${desk ? `<a class="topbar__back" href="#/shifts">← shifts</a>` : `<a class="ws ws--home" href="/" title="Home" aria-label="Home"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg></a>`}
 <span class="spacer"></span>
 ${desk ? "" : `<button class="btn-ghost" type="button" id="help-tour" title="Show the tour again">Tour</button>`}
 </header>
 <div class="frame">
 ${desk ? "" : `<nav class="sidenav">
 ${nav.map(([h, t, k, tour]) =>
 `<a href="${h}" class="${k === active ? "active" : ""}" data-tour="${tour}">${t}</a>`).join("")}
 </nav>`}
 <main class="content${opts.wide || desk ? " content--wide" : ""}"></main>
 </div>
 </div>`);
 const help = root.querySelector("#help-tour");
 if (help) {
 help.onclick = () => {
 if (window.NightshiftTour) {
 NightshiftTour.reset();
 NightshiftTour.start(true);
 }
 };
 }
 root.querySelector("main.content").append(contentNode);
 app.replaceChildren(root);
}

async function ensureSession() {
 if (state.email && state.wsId) return true;
 const me = await api("/auth/me");
 state.email = me.email;
 state.workspaces = me.workspaces;
 state.wsId = me.workspaces[0] && me.workspaces[0].id;
 if (!state.wsId) throw new Error("no public workspace configured");
 return true;
}

/* ------------------------------------------------------------- wake modal */

function openWakeModal() {
 const back = el(`
 <div class="modal-backdrop">
 <div class="modal">
 <h3>Wake the night shift</h3>
 <p class="modal-sub">Describe what looks wrong, point at where it hurts. The agent does the rest.</p>
 <form>
 <label class="field"><span>Symptom</span>
 <input type="text" name="symptom" placeholder="revenue by region is empty this morning" required></label>
 <label class="field"><span>Entry point URN</span>
 <input type="text" name="urn" class="urn-input" placeholder="urn:li:dataset:(urn:li:dataPlatform:postgres,...)" required></label>
 <div class="form-error"></div>
 <div class="actions">
 <button type="button" class="btn-ghost" data-close>Cancel</button>
 <button type="submit" class="btn-primary">Start the shift</button>
 </div>
 </form>
 </div>
 </div>`);
 const close = () => back.remove();
 back.addEventListener("click", (e) => { if (e.target === back) close(); });
 back.querySelector("[data-close]").onclick = close;
 const form = back.querySelector("form");
 const err = back.querySelector(".form-error");
 form.onsubmit = async (e) => {
 e.preventDefault();
 err.textContent = "";
 try {
 const r = await api(`/workspaces/${state.wsId}/shifts`, {
 body: { symptom: form.symptom.value.trim(), entry_point_urn: form.urn.value.trim() },
 });
 close();
 location.hash = "#/shifts/" + r.shift_id;
 } catch (ex) {
 err.textContent = ex.message;
 }
 };
 document.body.append(back);
 form.symptom.focus();
}

/* -------------------------------------------------------------- dashboard */

function shiftRow(s) {
 const trig = `<span class="badge">${esc(s.trigger)}</span>`;
 const mem = s.started_from_memory ? `<span class="badge memory">from memory</span>` : "";
 const st = `<span class="badge status-${esc(s.status)}">${esc(s.status)}</span>`;
 return `<a class="row" href="#/shifts/${esc(s.id)}">
 ${trig}${mem}
 <span class="symptom">${esc(s.symptom)}</span>
 ${st}
 <span class="when">${esc(fmtWhen(s.started_at))}</span>
 </a>`;
}

const EMPTY_SHIFTS = `
 <div class="empty">
 <span class="moon-mark">&#9789;</span>
 <p>No shifts yet. The pager hasn't rung.</p>
 </div>`;

async function viewDashboard() {
 const node = el(`<div>
 <div class="page-head">
 <div class="grow">
 <h2 class="page-title">Night desk</h2>
 <p class="page-sub">While you sleep, the graph remembers.</p>
 </div>
 <a class="btn-primary" href="#/live" data-tour="wake">Break / Wake live</a>
 </div>
 <div class="plate sentinel-band" id="sentinel" data-tour="sentinel">
 <span class="dot"></span>
 <span class="state">&mdash;</span>
 <span class="note"></span>
 <span class="spacer"></span>
 <a href="#/settings" style="font-size:12px">Configure</a>
 </div>
 <section class="block">
 <h3>What memory saves</h3>
 <div class="stat-grid" id="stats"></div>
 </section>
 <section class="block">
 <h3>Recent shifts</h3>
 <div class="plate rowlist" id="recent"></div>
 </section>
 </div>`);
 shell("dashboard", node);
 if (window.NightshiftTour) setTimeout(() => NightshiftTour.start(false), 350);

 const [ws, stats, shifts] = await Promise.all([
 api(`/workspaces/${state.wsId}`),
 api(`/workspaces/${state.wsId}/stats`),
 api(`/workspaces/${state.wsId}/shifts`),
 ]).catch(() => [null, null, null]);

 const band = node.querySelector("#sentinel");
 if (ws) {
 band.classList.toggle("on", !!ws.sentinel_enabled);
 band.querySelector(".state").textContent = ws.sentinel_enabled ? "Sentinel is on watch" : "Sentinel is off";
 band.querySelector(".note").textContent = ws.sentinel_enabled
 ? `Checking ${ws.watches.length} dataset${ws.watches.length === 1 ? "" : "s"} every ${ws.sentinel_interval_s}s`
 : ws.gms_url ? "Nobody is watching the graph tonight" : "Connect your DataHub first";
 }

 const grid = node.querySelector("#stats");
 if (stats && stats.shifts_total > 0) {
 const c = stats.cold, m = stats.memory;
 const fmt = (v, unit) => v == null ? `<span style="color:var(--faint)">&mdash;</span>` : `${v}<span class="unit">${unit}</span>`;
 let delta = "";
 if (c.avg_minutes != null && m.avg_minutes != null && c.avg_minutes > 0) {
 const pct = Math.round((1 - m.avg_minutes / c.avg_minutes) * 100);
 delta = `<div class="plate stat-tile delta">
 <div class="label">Memory delta</div>
 <div class="value">&minus;${pct}<span class="unit">% time</span></div>
 <div class="foot">${stats.from_memory} of ${stats.shifts_total} shifts started from memory</div>
 </div>`;
 }
 grid.innerHTML = `
 <div class="plate stat-tile">
 <div class="label">Cold night &middot; calls</div>
 <div class="value">${fmt(c.avg_investigation_calls, "avg")}</div>
 <div class="foot">investigation calls, no memory</div>
 </div>
 <div class="plate stat-tile">
 <div class="label">Cold night &middot; time</div>
 <div class="value">${fmt(c.avg_minutes, "min")}</div>
 </div>
 <div class="plate stat-tile">
 <div class="label">From memory &middot; calls</div>
 <div class="value">${fmt(m.avg_investigation_calls, "avg")}</div>
 <div class="foot">the graph already knew</div>
 </div>
 <div class="plate stat-tile">
 <div class="label">From memory &middot; time</div>
 <div class="value">${fmt(m.avg_minutes, "min")}</div>
 </div>
 ${delta}`;
 } else {
 grid.innerHTML = `<div class="plate stat-tile" style="grid-column:1/-1">
 <div class="label">ROI counter</div>
 <div class="foot" style="margin-top:0">No finished shifts yet. Run one cold, break it again, and watch memory pay.</div>
 </div>`;
 }

 const recent = node.querySelector("#recent");
 recent.innerHTML = shifts && shifts.length
 ? shifts.slice(0, 5).map(shiftRow).join("")
 : EMPTY_SHIFTS;
}

/* ----------------------------------------------------------- live pipeline */

async function viewLive() {
 const node = el(`<div class="live" data-tour="live">
 <div class="page-head">
 <div class="grow">
 <h2 class="page-title">Live pipeline</h2>
 <p class="page-sub">Real break on your DataHub. Wake the night shift. Restore when you are done. No mocks.</p>
 </div>
 </div>
 <div class="live__status plate" id="live-status">
 <span class="pill" id="live-pill">idle</span>
 <span id="live-text">Connect DataHub in Settings, then break a real pipeline.</span>
 </div>
 <div class="live__actions">
 <button type="button" id="live-break" class="btn-break">Break the pipeline</button>
 <button type="button" id="live-wake" class="btn-primary" disabled>Wake the night shift</button>
 <button type="button" id="live-restore" class="btn-ghost">Restore</button>
 </div>
 <p class="live__hint" id="live-hint">Break rewrites a real upstream schema on your graph. Wake runs the real agent. Restore puts the column back; memories stay.</p>
 </div>`);
 shell("live", node);

 const pill = node.querySelector("#live-pill");
 const text = node.querySelector("#live-text");
 const hint = node.querySelector("#live-hint");
 const btnBreak = node.querySelector("#live-break");
 const btnWake = node.querySelector("#live-wake");
 const btnRestore = node.querySelector("#live-restore");

 const paint = (s) => {
 if (!s.connected) {
 pill.className = "pill";
 pill.textContent = "offline";
 text.textContent = "No DataHub connection. Open Settings and paste your GMS URL + token.";
 btnBreak.disabled = true;
 btnWake.disabled = true;
 btnRestore.disabled = true;
 return;
 }
 if (s.shift_running) {
 pill.className = "pill is-live";
 pill.textContent = "running";
 text.textContent = "Night shift is working. Open Shifts to watch the desk.";
 btnBreak.disabled = true;
 btnWake.disabled = true;
 btnRestore.disabled = true;
 return;
 }
 if (s.planted) {
 pill.className = "pill is-broken";
 pill.textContent = "broken";
 text.textContent = "`" + s.planted.old_column + "` is now `" + s.planted.new_column +
 "` upstream. Downstream still selects the old name.";
 btnBreak.disabled = true;
 btnWake.disabled = false;
 btnRestore.disabled = false;
 return;
 }
 pill.className = "pill";
 pill.textContent = "healthy";
 text.textContent = "Pipeline is healthy on your DataHub. Break it when you are ready.";
 btnBreak.disabled = false;
 btnWake.disabled = true;
 btnRestore.disabled = false;
 };

 const refresh = async () => {
 try {
 paint(await api(`/workspaces/${state.wsId}/live`));
 } catch (ex) {
 text.textContent = ex.message;
 }
 };

 btnBreak.onclick = async () => {
 btnBreak.disabled = true;
 btnBreak.textContent = "Breaking…";
 hint.textContent = "Planting a silent upstream rename on your DataHub…";
 try {
 await api(`/workspaces/${state.wsId}/live/break`, { method: "POST", body: {} });
 } catch (ex) {
 hint.textContent = ex.message;
 } finally {
 btnBreak.textContent = "Break the pipeline";
 await refresh();
 }
 };

 btnWake.onclick = async () => {
 btnWake.disabled = true;
 btnWake.textContent = "Waking…";
 hint.textContent = "Starting a real night shift on your graph…";
 try {
 const r = await api(`/workspaces/${state.wsId}/live/wake`, { method: "POST", body: {} });
 location.hash = "#/shifts/" + r.shift_id;
 return;
 } catch (ex) {
 hint.textContent = ex.message;
 btnWake.textContent = "Wake the night shift";
 await refresh();
 }
 };

 btnRestore.onclick = async () => {
 btnRestore.disabled = true;
 btnRestore.textContent = "Restoring…";
 try {
 await api(`/workspaces/${state.wsId}/live/restore`, { method: "POST", body: {} });
 hint.textContent = "Schema restored. Memories stay in the graph.";
 } catch (ex) {
 hint.textContent = ex.message;
 } finally {
 btnRestore.textContent = "Restore";
 await refresh();
 }
 };

 await refresh();
 state.pollTimer = setInterval(refresh, 2000);
}

/* ----------------------------------------------------------------- shifts */

async function viewShifts() {
 const node = el(`<div>
 <div class="page-head">
 <div class="grow">
 <h2 class="page-title">Shifts</h2>
 <p class="page-sub">Every night the agent worked, on the record.</p>
 </div>
 <button class="btn-primary" id="wake" data-tour="wake">Wake the night shift</button>
 </div>
 <div class="plate rowlist" id="list"></div>
 </div>`);
 node.querySelector("#wake").onclick = openWakeModal;
 shell("shifts", node);
 const shifts = await api(`/workspaces/${state.wsId}/shifts`).catch(() => []);
 node.querySelector("#list").innerHTML = shifts.length
 ? shifts.map(shiftRow).join("")
 : EMPTY_SHIFTS;
}

/* --------------------------------------------------------------- evidence */
/* Lineage-path reconstruction from a finished shift: URNs cited in the
 events + conclusion, ordered upstream→downstream via the workspace
 postmortem memory when available, else by role/appearance. Pure - no DOM. */

function nsParseDatasetUrn(urn) {
 const m = String(urn || "").match(/^urn:li:dataset:\(urn:li:dataPlatform:([^,]+),([^,]+),[^)]*\)$/);
 if (!m) return null;
 const segs = m[2].split(".");
 return { urn, platform: m[1], name: m[2], short: segs[segs.length - 1] };
}

function nsFindDatasetUrns(text) {
 return String(text || "").match(/urn:li:dataset:\([^)]*\)/g) || [];
}

/* value of key=... in an event detail string; URN values contain commas
 inside parens, so match the full urn form first. */
function nsEventValue(detail, key) {
 const m = String(detail || "").match(
 new RegExp(key + "=(urn:li:dataset:\\([^)]*\\)|urn:[^,\\s]+|[^,\\s]+)"));
 return m ? m[1] : null;
}

function nsBuildLineage(shift, memory) {
 const events = shift.events || [];
 const nodes = [];
 const add = (u) => {
 if (nodes.some((n) => n.urn === u)) return;
 const p = nsParseDatasetUrn(u);
 if (p) nodes.push(p);
 };
 events.forEach((ev) => nsFindDatasetUrns(ev.detail).forEach(add));
 nsFindDatasetUrns(shift.conclusion).forEach(add);
 if (shift.entry_point_urn) add(shift.entry_point_urn);
 if (nodes.length < 2) return null;

 const victim = nodes.some((n) => n.urn === shift.entry_point_urn)
 ? shift.entry_point_urn : null;
 let upstream = null;
 let column = null;
 const guards = new Map(); // urn -> column guarded
 events.forEach((ev) => {
 const l = ev.label || "", d = ev.detail || "";
 if (l.includes("remember")) upstream = nsEventValue(d, "upstream_urn") || upstream;
 if (l.includes("guard_column")) {
 const gu = nsEventValue(d, "dataset_urn");
 if (gu) guards.set(gu, nsEventValue(d, "column") || "");
 }
 });

 // Postmortem memory: lineage_path gives the true upstream→downstream order.
 let path = null;
 if (memory && Array.isArray(memory.assets)) {
 for (const a of memory.assets) {
 for (const p of a.postmortems || []) {
 const lp = Array.isArray(p.lineage_path) ? p.lineage_path : null;
 if (!lp || !lp.some((u) => nodes.some((n) => n.urn === u))) continue;
 if (!path || a.dataset_urn === victim) {
 path = lp;
 upstream = p.upstream_urn || upstream;
 column = p.changed_field || column;
 }
 }
 }
 }
 const appear = new Map(nodes.map((n, i) => [n.urn, i]));
 if (path) {
 const idx = (n) => { const i = path.indexOf(n.urn); return i < 0 ? path.length + appear.get(n.urn) : i; };
 nodes.sort((a, b) => idx(a) - idx(b));
 } else {
 // heuristic: culprit upstream first, victim last, rest in appearance order
 const rank = (n) => n.urn === upstream ? 0 : n.urn === victim ? 2 : 1;
 nodes.sort((a, b) => rank(a) - rank(b) || appear.get(a.urn) - appear.get(b.urn));
 }

 const culprit = upstream && nodes.some((n) => n.urn === upstream) ? upstream : nodes[0].urn;
 if (!column && guards.size) column = guards.values().next().value || null;
 return nodes.map((n) => ({
 ...n,
 role: n.urn === culprit ? "culprit" : n.urn === victim ? "victim" : "mid",
 guarded: guards.has(n.urn),
 column: n.urn === culprit ? column : null,
 }));
}

/* Inline SVG: horizontal chain of pills with arrows. */
function nsEvidenceSVG(nodes) {
 const CH = 7.3, PADX = 16, GAP = 54, H = 108, PILL_Y = 30, PILL_H = 34;
 const midY = PILL_Y + PILL_H / 2;
 const widths = nodes.map((n) =>
 Math.max(84, Math.max(n.short.length, n.platform.length) * CH + PADX * 2));
 const total = widths.reduce((a, b) => a + b, 0) + GAP * (nodes.length - 1) + 8;
 let x = 4;
 const parts = [];
 nodes.forEach((n, i) => {
 const w = widths[i], cx = x + w / 2;
 const culprit = n.role === "culprit";
 const stroke = culprit ? "#ff6b6b" : "rgba(255,255,255,0.18)";
 const nameFill = culprit ? "#ff6b6b" : "#e8e8e8";
 if (n.guarded) {
 parts.push(`<rect x="${x - 4}" y="${PILL_Y - 4}" width="${w + 8}" height="${PILL_H + 8}"
 rx="21" fill="none" stroke="#5fd29a" stroke-width="1.5" stroke-dasharray="3 3"/>`);
 }
 parts.push(`<text x="${cx}" y="${PILL_Y - 10}" text-anchor="middle"
 font-family="var(--mono)" font-size="10" letter-spacing="0.08em"
 fill="${culprit ? "rgba(255,107,107,0.75)" : "#6a6a6a"}">${esc(n.platform.toUpperCase())}</text>`);
 parts.push(`<rect x="${x}" y="${PILL_Y}" width="${w}" height="${PILL_H}" rx="17"
 fill="${culprit ? "rgba(255,107,107,0.08)" : "#101010"}"
 stroke="${stroke}" stroke-width="1"/>`);
 parts.push(`<text x="${cx}" y="${midY + 4}" text-anchor="middle"
 font-family="var(--mono)" font-size="12" font-weight="600"
 fill="${nameFill}">${esc(n.short)}</text>`);
 if (n.column) {
 parts.push(`<text x="${cx}" y="${PILL_Y + PILL_H + 18}" text-anchor="middle"
 font-family="var(--mono)" font-size="10.5" fill="#ff6b6b">&#9888; ${esc(n.column)}</text>`);
 } else if (n.role === "victim") {
 parts.push(`<text x="${cx}" y="${PILL_Y + PILL_H + 18}" text-anchor="middle"
 font-family="var(--mono)" font-size="10" letter-spacing="0.1em" fill="#9a9a9a">IMPACTED</text>`);
 } else if (n.guarded) {
 parts.push(`<text x="${cx}" y="${PILL_Y + PILL_H + 18}" text-anchor="middle"
 font-family="var(--mono)" font-size="10" letter-spacing="0.1em" fill="#5fd29a">GUARDED</text>`);
 }
 if (i < nodes.length - 1) {
 const x1 = x + w + 6, x2 = x + w + GAP - 8;
 parts.push(`<line x1="${x1}" y1="${midY}" x2="${x2}" y2="${midY}"
 stroke="rgba(20,22,28,0.28)" stroke-width="1" marker-end="url(#ns-arrow)"/>`);
 }
 x += w + GAP;
 });
 return `<svg width="${total}" height="${H}" viewBox="0 0 ${total} ${H}"
 role="img" aria-label="Lineage path" style="display:block">
 <defs><marker id="ns-arrow" viewBox="0 0 8 8" refX="7" refY="4"
 markerWidth="7" markerHeight="7" orient="auto">
 <path d="M0 0 L8 4 L0 8 z" fill="rgba(20,22,28,0.4)"/></marker></defs>
 ${parts.join("")}</svg>`;
}

/* --------------------------------------------------------------- war room */

function wrAspectKey(label) {
 const l = (label || "").toLowerCase();
 if (l.includes("open_incident") || l.includes("resolve_incident")) return "incident";
 if (l.includes("remember_incident")) return "memory";
 if (l.includes("guard_column") || l.includes("immunize")) return "guard";
 if (l.includes("open_fix_pr")) return "pr";
 if (l.includes("recall") || l.includes("failure_mode")) return "recall";
 return null;
}

function wrStepFor(label, kind) {
 const l = (label || "").toLowerCase();
 if (l.includes("recall") || l.includes("failure_mode")) return "recall";
 if (l.includes("lineage") || l.includes("schema") || l.includes("get_entities") || l.includes("dataset_queries")) return "lineage";
 if (l.includes("open_incident") || kind === "thought") return "diagnose";
 if (l.includes("remember") || l.includes("guard") || l.includes("immunize") || l.includes("resolve")) return "remember";
 if (l.includes("open_fix_pr") || l.includes("fix")) return "fix";
 return null;
}

const WR_TOOL_PLAIN = [
 [/recall|failure_mode/, "Checking memory for a known failure"],
 [/lineage|get_lineage/, "Walking lineage upstream"],
 [/schema|list_schema|get_entities|dataset_queries/, "Reading the real schema"],
 [/open_incident/, "Opening an incident in DataHub"],
 [/resolve_incident/, "Resolving the incident"],
 [/remember_incident/, "Writing the postmortem into the graph"],
 [/guard_column|immunize/, "Leaving a presence guard"],
 [/open_fix_pr/, "Opening a draft fix PR"],
 [/toolsearch|tool_search/, "Loading the tools for this shift"],
 [/search|query/, "Searching the catalog"],
];

function wrPlainTool(label) {
 const l = (label || "").toLowerCase();
 for (const [re, text] of WR_TOOL_PLAIN) if (re.test(l)) return text;
 return "Working in DataHub";
}

function wrBubble(kind, kicker, bodyHtml) {
 return `<div class="wr-row is-${kind}">` +
 `<div class="wr-kicker">${esc(kicker)}</div>` +
 `<div class="wr-bubble wr-bubble--${kind}">${bodyHtml}</div></div>`;
}

async function viewWarroom(shiftId) {
 const node = el(`<div class="wr" data-tour="warroom">
 <header class="wr__top">
 <div class="wr__top-left">
 <span class="wr__status" id="wr-status">idle</span>
 <b id="wr-title">Night desk</b>
 </div>
 <div class="wr__top-right" id="wr-meta"></div>
 </header>
 <div class="wr__grid">
 <section class="wr__chat">
 <div class="wr__stream" id="wr-stream">
 <div class="wr-stream__pin" id="wr-pin" aria-hidden="true"></div>
 </div>
 <div class="wr__composer">
 <p class="wr__hint" id="wr-hint">Same night desk as the live demo. Watch the chat and the DataHub checklist.</p>
 </div>
 <div class="plate evidence" id="evidence" hidden>
 <div class="head">Lineage path</div>
 <div class="evidence-scroll"></div>
 </div>
 </section>
 <aside class="wr__rail" data-tour="writeback">
 <div class="wr__rail-head">DataHub</div>
 <ul class="wr__aspects" id="wr-aspects">
 <li data-aspect="recall"><span>Memory check</span><i>✓</i></li>
 <li data-aspect="incident"><span>Incident</span><i>✓</i></li>
 <li data-aspect="memory"><span>Postmortem</span><i>✓</i></li>
 <li data-aspect="guard"><span>Presence guard</span><i>✓</i></li>
 <li data-aspect="pr"><span>Draft fix PR</span><i>✓</i></li>
 </ul>
 <p class="wr__rail-note">When a row checks off, Nightshift wrote it into your graph.</p>
 </aside>
 </div>
 </div>`);
 shell("shifts", node, { wide: true, desk: true });

 let lastSig = "";
 let evidenceTried = false;
 let stickBottom = true;
 const lit = new Set();
 const stream = node.querySelector("#wr-stream");

 stream.addEventListener("scroll", () => {
 const gap = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
 stickBottom = gap < 96;
 }, { passive: true });

 const scrollChat = (force) => {
 if (!force && !stickBottom) return;
 requestAnimationFrame(() => {
 const p = node.querySelector("#wr-pin");
 if (p) p.scrollIntoView({ block: "end", behavior: "smooth" });
 else stream.scrollTop = stream.scrollHeight;
 });
 };

 const lightAspect = (key) => {
 if (!key || lit.has(key)) return;
 lit.add(key);
 const li = node.querySelector(`[data-aspect="${key}"]`);
 if (li) li.classList.add("is-on");
 };

 const maybeEvidence = async (s) => {
 if (evidenceTried || s.status !== "done") return;
 evidenceTried = true;
 let memory = null;
 try { memory = await api(`/workspaces/${state.wsId}/memory`); } catch {}
 const lineage = nsBuildLineage(s, memory);
 if (!lineage) return;
 const box = node.querySelector("#evidence");
 box.querySelector(".evidence-scroll").innerHTML = nsEvidenceSVG(lineage);
 box.hidden = false;
 scrollChat(true);
 };

 const render = (s) => {
 node.querySelector("#wr-title").textContent =
 s.started_from_memory ? "Night shift · from memory" : "Night shift · cold";
 node.querySelector("#wr-meta").textContent =
 `${s.trigger || "manual"} · ${fmtWhen(s.started_at)}`;
 const status = node.querySelector("#wr-status");
 status.textContent = s.status;
 status.className = "wr__status status-" + s.status;

 const events = s.events || [];
 const running = s.status === "running";
 node.querySelector("#wr-hint").textContent = running
 ? "Nightshift is working. Watch the chat and the DataHub checklist."
 : s.conclusion
 ? "Shift over. Open DataHub if you want the write-back proof."
 : "Waiting for the night shift to start writing.";

 const sig = events.length + "|" + (s.conclusion || "") + "|" + s.status;
 if (sig === lastSig) return running;
 lastSig = sig;

 lit.clear();
 node.querySelectorAll(".wr__aspects li").forEach((li) => li.classList.remove("is-on"));

 const thoughts = events.filter((ev) => classify(ev) === "thought");
 const tools = events.filter((ev) => classify(ev) !== "thought");
 const parts = [];

 if (s.symptom) {
 const urn = s.entry_point_urn
 ? `<div class="wr-meta">${esc(s.entry_point_urn)}</div>`
 : "";
 parts.push(wrBubble("user", "Pager", esc(s.symptom) + urn));
 }

 const stepSeen = new Set();
 const stepLines = [];
 tools.forEach((ev) => {
 const label = ev.label || "";
 const aspect = wrAspectKey(label);
 if (aspect) lightAspect(aspect);
 const plain = wrPlainTool(label);
 if (!stepSeen.has(plain) && stepLines.length < 6) {
 stepSeen.add(plain);
 stepLines.push(plain);
 }
 });

 if (tools.length || running) {
 const stepsHtml = stepLines.map((t) => `<div><b>·</b> ${esc(t)}</div>`).join("");
 const head = running
 ? `<div class="wr-working"><span class="wr-dots"><i></i><i></i><i></i></span><span>On it</span></div>`
 : `<div class="wr-working"><span>What it did</span></div>`;
 parts.push(wrBubble("assistant", "Nightshift", head + `<div class="wr-steps">${stepsHtml}</div>`));
 }

 thoughts.forEach((ev, i) => {
 const t = (ev.detail || "").trim();
 if (!t) return;
 if (t.length < 48 && i < thoughts.length - 1) return;
 parts.push(wrBubble("assistant", "Nightshift", esc(t)));
 });

 if (!running && s.conclusion) {
 ["incident", "memory", "guard", "pr"].forEach(lightAspect);
 const failed = s.status === "failed";
 const kicker = failed ? "Shift failed" : "Morning report";
 parts.push(
 `<div class="wr-row is-assistant">` +
 `<div class="wr-kicker">${esc(kicker)}</div>` +
 `<div class="wr-bubble wr-bubble--assistant${failed ? " is-failed" : ""}">${esc(s.conclusion)}</div></div>`
 );
 }

 stream.innerHTML = (parts.join("") ||
 `<div class="empty"><p>Waiting for the night shift to start writing.</p></div>`) +
 `<div class="wr-stream__pin" id="wr-pin" aria-hidden="true"></div>`;
 stickBottom = true;
 scrollChat(true);

 if (!running) maybeEvidence(s);
 return running;
 };

 const load = () => api(`/workspaces/${state.wsId}/shifts/${shiftId}`);
 try {
 const s = await load();
 if (render(s)) {
 state.pollTimer = setInterval(async () => {
 try {
 if (!render(await load())) stopPolling();
 } catch { stopPolling(); }
 }, 800);
 }
 } catch (ex) {
 stream.innerHTML = `<div class="empty"><p>${esc(ex.message)}</p></div>`;
 }
}

/* ----------------------------------------------------------------- memory */

async function viewMemory() {
 const node = el(`<div>
 <div class="page-head">
 <div class="grow">
 <h2 class="page-title">Memory</h2>
 <p class="page-sub" id="memcount">Reading the graph&hellip;</p>
 </div>
 <input type="text" class="memory-filter" id="filter" placeholder="Filter by dataset, failure mode, cause&hellip;">
 </div>
 <div id="assets"></div>
 </div>`);
 shell("memory", node);

 let data;
 try {
 data = await api(`/workspaces/${state.wsId}/memory`);
 } catch (ex) {
 node.querySelector("#memcount").textContent = "";
 node.querySelector("#assets").innerHTML = `<div class="plate"><div class="empty">
 <span class="moon-mark">&#9789;</span><p>${esc(ex.message)}</p>
 <div class="action"><a href="#/settings">Connect DataHub</a></div></div></div>`;
 return;
 }

 node.querySelector("#memcount").textContent =
 `${data.total_postmortems} postmortem${data.total_postmortems === 1 ? "" : "s"}. The graph remembers.`;

 const renderAssets = (filter) => {
 const q = (filter || "").toLowerCase();
 const match = (a) => !q || a.dataset_urn.toLowerCase().includes(q) ||
 a.postmortems.some((p) =>
 [p.failure_mode, p.summary, p.root_cause].some((x) => (x || "").toLowerCase().includes(q)));
 const shown = data.assets.filter(match);
 if (!shown.length) {
 node.querySelector("#assets").innerHTML = `<div class="plate"><div class="empty">
 <span class="moon-mark">&#9789;</span>
 <p>${data.assets.length ? "Nothing matches that filter." : "The graph has no scars yet. Run a shift; it will remember."}</p>
 </div></div>`;
 return;
 }
 node.querySelector("#assets").innerHTML = shown.map((a) => `
 <div class="plate asset">
 <div class="asset-urn">${esc(a.dataset_urn)}</div>
 ${a.postmortems.map((p) => `
 <div class="pm">
 <div class="pm-head">
 <span class="tag-failure">${esc(p.failure_mode || "unknown")}</span>
 <span class="pm-date">${p.recorded_at_ms ? esc(fmtWhen(new Date(p.recorded_at_ms).toISOString())) : ""}</span>
 ${p.fix_url ? `<a href="${esc(p.fix_url)}" target="_blank" rel="noopener" style="font-size:11.5px">fix</a>` : ""}
 </div>
 <div class="pm-summary">${esc(p.summary || "")}</div>
 ${p.root_cause ? `<div class="pm-root"><b>root cause</b> &mdash; ${esc(p.root_cause)}</div>` : ""}
 </div>`).join("")}
 </div>`).join("");
 };
 renderAssets("");
 node.querySelector("#filter").addEventListener("input", (e) => renderAssets(e.target.value));
}

/* --------------------------------------------------------------- settings */

async function viewSettings() {
 const node = el(`<div>
 <div class="page-head"><div class="grow">
 <h2 class="page-title">Settings</h2>
 <p class="page-sub">The connection, the watchman, the watchlist.</p>
 </div></div>

 <section class="block">
 <h3>DataHub connection</h3>
 <div class="plate settings-card" data-tour="conn">
 <form id="conn-form">
 <label class="field"><span>GMS URL</span>
 <input type="text" name="gms_url" class="urn-input" placeholder="http://localhost:8080"></label>
 <label class="field"><span>Token <span id="token-note" class="token-stored" style="text-transform:none;letter-spacing:0"></span></span>
 <input type="password" name="gms_token" class="urn-input" placeholder="leave empty for none" autocomplete="off"></label>
 <div class="actions">
 <button type="submit" class="btn-primary">Save &amp; test connection</button>
 <span class="hint" id="conn-hint"></span>
 </div>
 </form>
 </div>
 </section>

 <section class="block">
 <h3>Sentinel</h3>
 <div class="plate settings-card"><div class="stack">
 <div class="switch-row">
 <span class="switch"><input type="checkbox" id="sent-on"><span class="knob"></span></span>
 <span style="font-size:13px;font-weight:600" id="sent-label">Off</span>
 <span class="hint">wakes the shift on its own when a watched dataset breaks</span>
 </div>
 <label class="field" style="max-width:200px"><span>Check interval (seconds)</span>
 <input type="number" id="sent-interval" min="30" step="10" value="120"></label>
 <div class="actions">
 <button id="sent-save" class="btn-primary" type="button">Save</button>
 <span class="hint" id="sent-hint"></span>
 </div>
 </div></div>
 </section>

 <section class="block">
 <h3>Watched datasets</h3>
 <div class="plate settings-card">
 <div id="watches"></div>
 <div class="watch-add">
 <input type="text" id="watch-urn" class="urn-input" placeholder="urn:li:dataset:(&hellip;)">
 <button id="watch-add" type="button">Watch</button>
 </div>
 <div class="hint" id="watch-hint" style="margin-top:8px"></div>
 </div>
 </section>
 </div>`);
 shell("settings", node);

 let ws;
 try {
 ws = await api(`/workspaces/${state.wsId}`);
 } catch { return; }

 const connForm = node.querySelector("#conn-form");
 connForm.gms_url.value = ws.gms_url || "";
 node.querySelector("#token-note").textContent = ws.has_token
 ? "· token stored"
 : ws.connected || ws.gms_url
 ? "· connected (OSS, no token)"
 : "";
 const connHint = node.querySelector("#conn-hint");
 connForm.onsubmit = async (e) => {
 e.preventDefault();
 connHint.className = "hint";
 connHint.textContent = "testing…";
 try {
 await api(`/workspaces/${state.wsId}/connection`, {
 method: "PUT",
 body: { gms_url: connForm.gms_url.value.trim(), gms_token: connForm.gms_token.value },
 });
 connHint.className = "hint ok";
 connHint.textContent = "connected";
 if (connForm.gms_token.value) node.querySelector("#token-note").textContent = "· token stored";
 connForm.gms_token.value = "";
 } catch (ex) {
 connHint.className = "hint err";
 connHint.textContent = ex.message;
 }
 };

 const sentOn = node.querySelector("#sent-on");
 const sentLabel = node.querySelector("#sent-label");
 sentOn.checked = !!ws.sentinel_enabled;
 sentLabel.textContent = sentOn.checked ? "On watch" : "Off";
 sentOn.onchange = () => { sentLabel.textContent = sentOn.checked ? "On watch" : "Off"; };
 node.querySelector("#sent-interval").value = ws.sentinel_interval_s || 120;
 const sentHint = node.querySelector("#sent-hint");
 node.querySelector("#sent-save").onclick = async () => {
 sentHint.className = "hint";
 sentHint.textContent = "";
 try {
 await api(`/workspaces/${state.wsId}/sentinel`, {
 method: "PUT",
 body: {
 enabled: sentOn.checked,
 interval_s: parseInt(node.querySelector("#sent-interval").value, 10) || 120,
 },
 });
 sentHint.className = "hint ok";
 sentHint.textContent = "saved";
 } catch (ex) {
 sentHint.className = "hint err";
 sentHint.textContent = ex.message;
 }
 };

 const watchesBox = node.querySelector("#watches");
 const watchHint = node.querySelector("#watch-hint");
 const renderWatches = (watches) => {
 watchesBox.innerHTML = watches.length
 ? watches.map((w) => `
 <div class="watch-row" data-id="${esc(w.id)}">
 <span class="urn">${esc(w.dataset_urn)}</span>
 <span class="checked">${w.last_checked_at ? "checked " + esc(fmtWhen(w.last_checked_at)) : "never checked"}</span>
 <button class="btn-danger" data-del="${esc(w.id)}" type="button">Remove</button>
 </div>`).join("")
 : `<div class="hint" style="padding:6px 0">Nothing on the watchlist. The Sentinel has nowhere to look.</div>`;
 watchesBox.querySelectorAll("[data-del]").forEach((b) => {
 b.onclick = async () => {
 await api(`/workspaces/${state.wsId}/watches/${b.dataset.del}`, { method: "DELETE" }).catch(() => {});
 refreshWatches();
 };
 });
 };
 const refreshWatches = async () => {
 const fresh = await api(`/workspaces/${state.wsId}`).catch(() => null);
 if (fresh) renderWatches(fresh.watches);
 };
 renderWatches(ws.watches);
 node.querySelector("#watch-add").onclick = async () => {
 const input = node.querySelector("#watch-urn");
 const urn = input.value.trim();
 if (!urn) return;
 watchHint.className = "hint";
 watchHint.textContent = "";
 try {
 await api(`/workspaces/${state.wsId}/watches`, { body: { dataset_urn: urn } });
 input.value = "";
 refreshWatches();
 } catch (ex) {
 watchHint.className = "hint err";
 watchHint.textContent = ex.message;
 }
 };
}

/* ----------------------------------------------------------------- router */

async function route() {
 stopPolling();
 let hash = location.hash || "#/";
 if (hash === "#/login") {
 location.hash = "#/live";
 return;
 }
 try {
 await ensureSession();
 } catch (ex) {
 app.replaceChildren(el(`
 <div class="shell-root">
 <header class="topbar">
 <a href="/" class="wordmark"><span class="moon">&#9789;</span>Nightshift</a>
 </header>
 <main class="content" style="padding:32px">
 <p class="hint err">${esc(ex.message || "could not open the public workspace")}</p>
 </main>
 </div>`));
 return;
 }
 const m = hash.match(/^#\/shifts\/(.+)$/);
 if (m) return viewWarroom(m[1]);
 if (hash === "#/live") return viewLive();
 if (hash === "#/shifts") return viewShifts();
 if (hash === "#/memory") return viewMemory();
 if (hash === "#/settings") return viewSettings();
 return viewDashboard();
}

if (typeof window !== "undefined") {
 window.addEventListener("hashchange", route);
 route();
}
