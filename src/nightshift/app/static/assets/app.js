/* Nightshift SPA — vanilla JS, hash routing, no dependencies. */
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
  if (res.status === 401) {
    state.email = null;
    if (location.hash !== "#/login") location.hash = "#/login";
    throw new Error("not signed in");
  }
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
    ["#/shifts", "Shifts", "shifts", "nav-shifts"],
    ["#/memory", "Memory", "memory", "nav-memory"],
    ["#/settings", "Settings", "settings", "nav-settings"],
  ];
  const root = el(`
    <div class="shell-root">
      <header class="topbar">
        <a href="#/" class="wordmark"><span class="moon">&#9789;</span>NIGHTSHIFT</a>
        <span class="ws"></span>
        <span class="spacer"></span>
        <button class="btn-ghost" type="button" id="help-tour" title="Show the tour again">Tour</button>
        <span class="who"></span>
        <button class="btn-ghost" id="logout">Sign out</button>
      </header>
      <div class="frame">
        <nav class="sidenav">
          ${nav.map(([h, t, k, tour]) =>
            `<a href="${h}" class="${k === active ? "active" : ""}" data-tour="${tour}">${t}</a>`).join("")}
        </nav>
        <main class="content${opts.wide ? " content--wide" : ""}"></main>
      </div>
    </div>`);
  const ws = state.workspaces.find((w) => w.id === state.wsId);
  root.querySelector(".ws").textContent = ws ? ws.name : "";
  root.querySelector(".who").textContent = state.email || "";
  root.querySelector("#logout").onclick = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    state.email = null;
    location.hash = "#/login";
  };
  root.querySelector("#help-tour").onclick = () => {
    if (window.NightshiftTour) {
      NightshiftTour.reset();
      NightshiftTour.start(true);
    }
  };
  root.querySelector("main.content").append(contentNode);
  app.replaceChildren(root);
}

async function ensureSession() {
  if (state.email && state.wsId) return true;
  try {
    const me = await api("/auth/me");
    state.email = me.email;
    state.workspaces = me.workspaces;
    state.wsId = me.workspaces[0] && me.workspaces[0].id;
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ login */

function viewLogin() {
  const node = el(`
    <div class="login-wrap">
      <div class="plate login-card">
        <span class="wordmark"><span class="moon">&#9789;</span>NIGHTSHIFT</span>
        <p class="tagline">The agent that takes the night watch.</p>
        <div class="tabs">
          <button class="active" data-tab="login">Sign in</button>
          <button data-tab="register">Create account</button>
        </div>
        <form>
          <label class="field"><span>Email</span>
            <input type="email" name="email" autocomplete="email" required></label>
          <label class="field"><span>Password</span>
            <input type="password" name="password" autocomplete="current-password" required></label>
          <div class="form-error"></div>
          <button type="submit" class="btn-primary">Sign in</button>
        </form>
      </div>
    </div>`);
  let mode = "login";
  const form = node.querySelector("form");
  const err = node.querySelector(".form-error");
  const submit = form.querySelector('button[type="submit"]');
  node.querySelectorAll(".tabs button").forEach((b) => {
    b.onclick = () => {
      mode = b.dataset.tab;
      node.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
      submit.textContent = mode === "login" ? "Sign in" : "Create account";
      err.textContent = "";
    };
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.textContent = "";
    submit.disabled = true;
    try {
      await api("/auth/" + mode, {
        body: { email: form.email.value.trim(), password: form.password.value },
      });
      state.email = null; // force /auth/me refresh
      location.hash = "#/";
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      submit.disabled = false;
    }
  };
  app.replaceChildren(node);
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
        <h2 class="page-title">Dashboard</h2>
        <p class="page-sub">While you sleep, the graph remembers.</p>
      </div>
      <button class="btn-primary" id="wake" data-tour="wake">Wake the night shift</button>
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
  node.querySelector("#wake").onclick = openWakeModal;
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
      ? `checking ${ws.watches.length} dataset${ws.watches.length === 1 ? "" : "s"} every ${ws.sentinel_interval_s}s`
      : ws.gms_url ? "nobody is watching the graph tonight" : "connect your DataHub first";
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
   postmortem memory when available, else by role/appearance. Pure — no DOM. */

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

async function viewWarroom(shiftId) {
  const node = el(`<div class="wr" data-tour="warroom">
    <header class="wr__top">
      <div class="wr__top-left">
        <a class="wr__back" href="#/shifts">← shifts</a>
        <span class="wr__status" id="wr-status">idle</span>
        <b id="wr-title">War room</b>
      </div>
      <div class="wr__steps" id="wr-steps">
        <span class="wr__step" data-step="recall">Recall</span>
        <span class="wr__step" data-step="lineage">Lineage</span>
        <span class="wr__step" data-step="diagnose">Diagnose</span>
        <span class="wr__step" data-step="remember">Remember</span>
        <span class="wr__step" data-step="fix">Fix PR</span>
      </div>
      <div class="wr__top-right mono" id="wr-meta"></div>
    </header>
    <div class="wr__grid">
      <section class="wr__chat">
        <p class="wr__pager" id="wr-pager"></p>
        <p class="wr__urn mono" id="wr-urn"></p>
        <div class="wr__stream" id="wr-stream"></div>
        <div class="plate wr__report" id="wr-report" hidden>
          <div class="wr__report-head" id="wr-report-head">Morning report</div>
          <div class="wr__report-body" id="wr-report-body"></div>
        </div>
        <div class="plate evidence" id="evidence" hidden>
          <div class="head">Lineage path</div>
          <div class="evidence-scroll"></div>
        </div>
      </section>
      <aside class="wr__rail" data-tour="writeback">
        <div class="wr__rail-head">DataHub · write-back</div>
        <ul class="wr__aspects" id="wr-aspects">
          <li data-aspect="recall"><i style="--c:var(--memory)"></i><span>Memory read</span><b>·</b></li>
          <li data-aspect="incident"><i style="--c:var(--alarm)"></i><span>Incident</span><b>·</b></li>
          <li data-aspect="memory"><i style="--c:var(--moon)"></i><span>Postmortem</span><b>·</b></li>
          <li data-aspect="guard"><i style="--c:var(--write)"></i><span>Presence guard</span><b>·</b></li>
          <li data-aspect="pr"><i style="--c:var(--tool)"></i><span>Draft PR</span><b>·</b></li>
        </ul>
        <p class="wr__rail-note">The agent is the process behind this page. Saturation means it acted.</p>
      </aside>
    </div>
  </div>`);
  shell("shifts", node, { wide: true });

  let lastCount = -1;
  let evidenceTried = false;
  const lit = new Set();

  const lightAspect = (key) => {
    if (!key || lit.has(key)) return;
    lit.add(key);
    const li = node.querySelector(`[data-aspect="${key}"]`);
    if (!li) return;
    li.classList.add("is-on");
    li.querySelector("b").textContent = key === "recall" ? "read" : "written";
  };

  const setStep = (name) => {
    if (!name) return;
    let hit = false;
    node.querySelectorAll(".wr__step").forEach((el) => {
      const id = el.getAttribute("data-step");
      el.classList.remove("is-on");
      if (id === name) {
        el.classList.add("is-on", "is-done");
        hit = true;
      } else if (!hit) {
        el.classList.add("is-done");
      }
    });
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
  };

  const render = (s) => {
    node.querySelector("#wr-pager").textContent = s.symptom || "";
    node.querySelector("#wr-urn").textContent = s.entry_point_urn || "";
    node.querySelector("#wr-title").textContent =
      s.started_from_memory ? "Night shift · from memory" : "Night shift · cold";
    node.querySelector("#wr-meta").textContent =
      `${s.trigger || "manual"} · ${fmtWhen(s.started_at)}`;
    const status = node.querySelector("#wr-status");
    status.textContent = s.status;
    status.className = "wr__status status-" + s.status;

    const events = s.events || [];
    if (events.length !== lastCount) {
      lastCount = events.length;
      const stream = node.querySelector("#wr-stream");
      stream.innerHTML = events.map((ev) => {
        const css = classify(ev);
        const stamp = (ev.at || "").split("T").pop() || "";
        const label = ev.label || (css === "thought" ? "thinking" : "");
        const step = wrStepFor(label, ev.kind);
        if (step) setStep(step);
        const aspect = wrAspectKey(label);
        if (aspect) lightAspect(aspect);
        if (css === "thought") {
          return `<div class="wr-msg wr-msg--agent">
            <div class="wr-msg__who"><span>nightshift</span><time>${esc(stamp)}</time></div>
            <div class="wr-msg__body">${esc(ev.detail || "")}</div>
          </div>`;
        }
        return `<div class="wr-msg wr-msg--tool">
          <div class="wr-msg__who"><span>tool</span><time>${esc(stamp)}</time></div>
          <div class="wr-tool ${css}">
            <span class="wr-tool__name">${esc(label)}</span>
            <span class="wr-tool__stamp">${esc(stamp)}</span>
            <span class="wr-tool__detail">${esc(ev.detail || "")}</span>
          </div>
        </div>`;
      }).join("");
      stream.scrollTop = stream.scrollHeight;
    }

    const running = s.status === "running";
    const report = node.querySelector("#wr-report");
    if (!running && s.conclusion) {
      report.hidden = false;
      report.classList.toggle("failed", s.status === "failed");
      node.querySelector("#wr-report-head").textContent =
        s.status === "failed" ? "Shift failed" : "Morning report";
      node.querySelector("#wr-report-body").textContent = s.conclusion;
    }
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
      }, 2000);
    }
  } catch (ex) {
    node.querySelector("#wr-stream").innerHTML =
      `<div class="empty"><p>${esc(ex.message)}</p></div>`;
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
  const hash = location.hash || "#/";
  if (hash === "#/login") { viewLogin(); return; }
  const ok = await ensureSession();
  if (!ok) { location.hash = "#/login"; return; }
  const m = hash.match(/^#\/shifts\/(.+)$/);
  if (m) return viewWarroom(m[1]);
  if (hash === "#/shifts") return viewShifts();
  if (hash === "#/memory") return viewMemory();
  if (hash === "#/settings") return viewSettings();
  return viewDashboard();
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", route);
  route();
}
