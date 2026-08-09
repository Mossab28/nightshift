/* Nightshift SPA — vanilla JS, hash routing, no dependencies. */
"use strict";

const app = document.getElementById("app");

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

function shell(active, contentNode) {
  const nav = [
    ["#/", "Dashboard", "dashboard"],
    ["#/shifts", "Shifts", "shifts"],
    ["#/memory", "Memory", "memory"],
    ["#/settings", "Settings", "settings"],
  ];
  const root = el(`
    <div class="shell-root" style="display:flex;flex-direction:column;min-height:100vh">
      <header class="topbar">
        <a href="#/" class="wordmark"><span class="moon">&#9789;</span>NIGHTSHIFT</a>
        <span class="ws"></span>
        <span class="spacer"></span>
        <span class="who"></span>
        <button class="btn-ghost" id="logout">Sign out</button>
      </header>
      <div class="frame">
        <nav class="sidenav">
          ${nav.map(([h, t, k]) =>
            `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}
        </nav>
        <main class="content"></main>
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
      <button class="btn-primary" id="wake">Wake the night shift</button>
    </div>
    <div class="plate sentinel-band" id="sentinel">
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
      <button class="btn-primary" id="wake">Wake the night shift</button>
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

/* --------------------------------------------------------------- war room */

async function viewWarroom(shiftId) {
  const node = el(`<div>
    <div class="page-head">
      <div class="grow">
        <h2 class="page-title warroom-head"><span>War room</span> <span id="badges"></span></h2>
        <p class="page-sub" id="symptom"></p>
        <p class="urn mono" id="urn" style="font-size:12px;color:var(--faint);margin-top:4px;word-break:break-all"></p>
      </div>
      <a href="#/shifts" style="font-size:12px;white-space:nowrap">All shifts</a>
    </div>
    <div class="timeline" id="timeline"></div>
    <p class="working-note" id="working" hidden>
      <span class="dotpulse">&#9789;</span> The night shift is working. This page follows along.</p>
    <div class="plate conclusion" id="conclusion" hidden>
      <div class="head">MORNING REPORT</div>
      <div class="body"></div>
    </div>
  </div>`);
  shell("shifts", node);

  let lastCount = -1;
  const render = (s) => {
    node.querySelector("#symptom").textContent = s.symptom;
    node.querySelector("#urn").textContent = s.entry_point_urn || "";
    node.querySelector("#badges").innerHTML =
      `<span class="badge">${esc(s.trigger)}</span> <span class="badge status-${esc(s.status)}">${esc(s.status)}</span>`;
    const events = s.events || [];
    if (events.length !== lastCount) {
      lastCount = events.length;
      node.querySelector("#timeline").innerHTML = events.map((ev) => {
        const css = classify(ev);
        const stamp = (ev.at || "").split("T").pop();
        const label = ev.label || (css === "thought" ? "thinking" : "");
        return `<div class="event ${css}">
          <span class="stamp">${esc(stamp)}</span>
          <span class="label">${esc(label)}</span>
          <div class="detail">${esc(ev.detail || "")}</div>
        </div>`;
      }).join("");
    }
    const running = s.status === "running";
    node.querySelector("#working").hidden = !running;
    const conc = node.querySelector("#conclusion");
    if (!running && s.conclusion) {
      conc.hidden = false;
      conc.classList.toggle("failed", s.status === "failed");
      if (s.status === "failed") {
        conc.style.borderLeftColor = "var(--alarm)";
        conc.querySelector(".head").textContent = "SHIFT FAILED";
        conc.querySelector(".head").style.color = "var(--alarm)";
      }
      conc.querySelector(".body").textContent = s.conclusion;
    }
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
    node.querySelector("#timeline").innerHTML =
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
      <div class="plate settings-card">
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
  node.querySelector("#token-note").textContent = ws.has_token ? "· token stored" : "";
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

window.addEventListener("hashchange", route);
route();
