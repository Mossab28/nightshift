/* Nightshift landing — Murmell motion laws, Nightshift sky.
   The constellation is the pitch: break → heal → remember → catch. */

(function () {
  "use strict";

  var COLORS = {
    dim: [232, 232, 232],
    red: [255, 107, 107],
    green: [95, 210, 154],
    violet: [185, 138, 255],
    moon: [255, 215, 110],
    frost: [180, 200, 255],
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------ nav lift */

  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-lifted", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------ deterministic graph */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rnd = mulberry32(2047);
  var N = 38;
  var nodes = [];
  var edges = [];

  for (var i = 0; i < N; i++) {
    var fx = 0.06 + 0.88 * (i / (N - 1));
    nodes.push({
      x: fx + (rnd() - 0.5) * 0.12,
      y: 0.12 + 0.62 * rnd(),
      r: 1.5 + rnd() * 1.8,
      phase: rnd() * Math.PI * 2,
      speed: 0.15 + rnd() * 0.2,
      amp: 2.5 + rnd() * 3,
    });
  }
  for (var j = 1; j < N; j++) {
    var cands = [];
    for (var k = 0; k < j; k++) {
      var dx = nodes[j].x - nodes[k].x, dy = nodes[j].y - nodes[k].y;
      cands.push({ k: k, d: dx * dx + dy * dy });
    }
    cands.sort(function (p, q) { return p.d - q.d; });
    var links = 1 + (rnd() < 0.45 ? 1 : 0);
    for (var l = 0; l < links && l < cands.length; l++) {
      edges.push({ a: cands[l].k, b: j });
    }
  }

  var ORIGIN = 6;
  var depth = {};
  depth[ORIGIN] = 0;
  var frontier = [ORIGIN], maxDepth = 0;
  while (frontier.length) {
    var next = [];
    frontier.forEach(function (n) {
      edges.forEach(function (e) {
        if (e.a === n && depth[e.b] === undefined && depth[n] < 4) {
          depth[e.b] = depth[n] + 1;
          maxDepth = Math.max(maxDepth, depth[e.b]);
          next.push(e.b);
        }
      });
    });
    frontier = next;
  }
  var affectedEdges = edges.filter(function (e) {
    return depth[e.a] !== undefined && depth[e.b] === depth[e.a] + 1;
  });

  /* --------------------------------------------------------- timeline */
  var LOOP = 22;
  var CAPTIONS = [
    { t: 0.0, text: "The graph is calm." },
    { t: 2.4, text: "Silent rename upstream." },
    { t: 4.6, text: "Memory wakes. Violet first." },
    { t: 5.8, text: "The shift heals the path." },
    { t: 8.2, text: "A guard lands on the origin." },
    { t: 13.8, text: "Same break. Night two." },
    { t: 14.4, text: "Caught. An investigation became a lookup." },
    { t: 18.0, text: "The graph is smarter than tonight found it." },
  ];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }

  function redness(t, d) {
    if (d === undefined) return 0;
    var r = 0;
    var hitA = 2.5 + d * 0.5;
    var healA = 5.8 + (maxDepth - d) * 0.55;
    r = Math.max(r, ease((t - hitA) / 0.35) * (1 - ease((t - healA) / 0.5)));
    var hitB = 14.0 + d * 0.5;
    var healB = 14.35 + d * 0.12;
    r = Math.max(r, ease((t - hitB) / 0.25) * (1 - ease((t - healB) / 0.3)));
    return clamp01(r);
  }

  function greenness(t, d) {
    if (d === undefined) return 0;
    var g = 0;
    var healA = 5.8 + (maxDepth - d) * 0.55;
    g = Math.max(g, ease((t - healA) / 0.5) * (1 - ease((t - 9.5) / 1.2)));
    var healB = 14.35 + d * 0.12;
    g = Math.max(g, ease((t - healB) / 0.3) * (1 - ease((t - 16.5) / 1.2)));
    return clamp01(g);
  }

  function violet(t) {
    var a = ease((t - 4.8) / 0.4) * (1 - ease((t - 6.2) / 0.6));
    var b = ease((t - 14.15) / 0.15) * (1 - ease((t - 14.9) / 0.3));
    return Math.max(a, b);
  }

  function ringAlpha(t) {
    return ease((t - 8.2) / 0.8) * (1 - ease((t - 21) / 1));
  }

  function captionAt(t) {
    var text = CAPTIONS[0].text;
    for (var i = 0; i < CAPTIONS.length; i++) {
      if (t >= CAPTIONS[i].t) text = CAPTIONS[i].text;
    }
    return text;
  }

  /* --------------------------------------------------------- rendering */

  var canvas = document.getElementById("sky");
  var captionEl = document.getElementById("sky-caption");
  var lastCaption = "";
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", function () { resize(); if (reduced) drawStatic(); });
  resize();

  function pos(n, t) {
    return {
      x: n.x * W + Math.sin(t * n.speed + n.phase) * n.amp,
      y: n.y * H + Math.cos(t * n.speed * 0.8 + n.phase * 1.7) * n.amp,
    };
  }

  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function mix(a, b, v) {
    return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, a[2] + (b[2] - a[2]) * v]
      .map(Math.round);
  }

  function drawMoon() {
    var mx = W * 0.82;
    var my = H * 0.18;
    var r = Math.min(W, H) * 0.09;
    var g = ctx.createRadialGradient(mx, my, r * 0.2, mx, my, r * 3.2);
    g.addColorStop(0, rgba(COLORS.moon, 0.22));
    g.addColorStop(0.35, rgba(COLORS.moon, 0.08));
    g.addColorStop(1, rgba(COLORS.moon, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Crescent via clip: full disc, then punch with black void (same as paper).
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = rgba(COLORS.moon, 0.92);
    ctx.shadowColor = rgba(COLORS.moon, 0.7);
    ctx.shadowBlur = 28;
    ctx.fillRect(mx - r - 4, my - r - 4, r * 2 + 8, r * 2 + 8);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(mx + r * 0.42, my - r * 0.08, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();
  }

  function draw(now) {
    var t = (now / 1000) % LOOP;
    var breath = 0.5 + 0.5 * Math.sin(now / 1000 * 0.5);
    ctx.clearRect(0, 0, W, H);

    // faint star dust
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (var s = 0; s < 48; s++) {
      var sx = ((s * 97) % 1000) / 1000 * W;
      var sy = ((s * 53) % 1000) / 1000 * H * 0.75;
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }

    drawMoon();

    var P = nodes.map(function (n) { return pos(n, now / 1000); });

    edges.forEach(function (e) {
      var ra = Math.max(redness(t, depth[e.a]), redness(t, depth[e.b]) * 0.7);
      var ga = Math.max(greenness(t, depth[e.a]), greenness(t, depth[e.b])) * 0.8;
      var base = 0.06 + breath * 0.03;
      ctx.beginPath();
      ctx.moveTo(P[e.a].x, P[e.a].y);
      ctx.lineTo(P[e.b].x, P[e.b].y);
      ctx.lineWidth = 1;
      if (ra > 0.02 || ga > 0.02) {
        var c = ga > ra ? COLORS.green : COLORS.red;
        ctx.strokeStyle = rgba(c, base + Math.max(ra, ga) * 0.55);
      } else {
        ctx.strokeStyle = "rgba(200,214,255," + (base + 0.02) + ")";
      }
      ctx.stroke();
    });

    affectedEdges.forEach(function (e) {
      var d = depth[e.a];
      [
        { t0: 2.5 + d * 0.5, dur: 0.5, from: e.a, to: e.b, c: COLORS.red },
        { t0: 5.8 + (maxDepth - 1 - d) * 0.55, dur: 0.55, from: e.b, to: e.a, c: COLORS.green },
        { t0: 14.0 + d * 0.5, dur: 0.5, from: e.a, to: e.b, c: COLORS.red },
        { t0: 14.3 + d * 0.12, dur: 0.25, from: e.a, to: e.b, c: COLORS.green },
      ].forEach(function (p) {
        var u = (t - p.t0) / p.dur;
        if (u <= 0 || u >= 1) return;
        var x = P[p.from].x + (P[p.to].x - P[p.from].x) * u;
        var y = P[p.from].y + (P[p.to].y - P[p.from].y) * u;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.c, 0.95);
        ctx.shadowColor = rgba(p.c, 0.85);
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });

    nodes.forEach(function (n, idx) {
      var r = redness(t, depth[idx]);
      var g = greenness(t, depth[idx]);
      var c = COLORS.frost;
      if (r > g) c = mix(COLORS.frost, COLORS.red, r);
      else if (g > 0) c = mix(COLORS.frost, COLORS.green, g);
      var alpha = 0.4 + breath * 0.12 + Math.max(r, g) * 0.55;
      ctx.beginPath();
      ctx.arc(P[idx].x, P[idx].y, n.r + Math.max(r, g) * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(c, alpha);
      if (r > 0.1 || g > 0.1) {
        ctx.shadowColor = rgba(c, 0.75);
        ctx.shadowBlur = 12;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    var v = violet(t);
    if (v > 0.01) {
      var o = P[ORIGIN];
      var pr = 3 + v * 4;
      ctx.beginPath();
      ctx.arc(o.x + 14, o.y - 12, pr, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.violet, v * 0.95);
      ctx.shadowColor = rgba(COLORS.violet, 0.85);
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    var ra = ringAlpha(t);
    if (ra > 0.01) drawRing(P[ORIGIN], nodes[ORIGIN].r, ra);

    if (captionEl) {
      var cap = captionAt(t);
      if (cap !== lastCaption) {
        lastCaption = cap;
        captionEl.style.opacity = "0";
        window.setTimeout(function () {
          captionEl.textContent = cap;
          captionEl.style.opacity = "1";
        }, 160);
      }
    }
  }

  function drawRing(p, r, alpha) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(COLORS.green, 0.75 * alpha);
    ctx.shadowColor = rgba(COLORS.green, 0.55 * alpha);
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    drawMoon();
    var P = nodes.map(function (n) { return { x: n.x * W, y: n.y * H }; });
    edges.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(P[e.a].x, P[e.a].y);
      ctx.lineTo(P[e.b].x, P[e.b].y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(200,214,255,0.08)";
      ctx.stroke();
    });
    nodes.forEach(function (n, idx) {
      ctx.beginPath();
      ctx.arc(P[idx].x, P[idx].y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,214,255,0.45)";
      ctx.fill();
    });
    drawRing(P[ORIGIN], nodes[ORIGIN].r, 1);
    if (captionEl) captionEl.textContent = "A guard already sits on the origin.";
  }

  if (reduced) {
    drawStatic();
  } else {
    var running = false, rafId = 0, heroVisible = true;
    var t0 = performance.now();
    var pausedAt = 0;

    function frame(now) {
      if (!running) return;
      draw(now - t0);
      rafId = requestAnimationFrame(frame);
    }
    function start() {
      if (running) return;
      running = true;
      t0 += performance.now() - pausedAt || 0;
      pausedAt = 0;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      if (!running) return;
      running = false;
      pausedAt = performance.now();
      cancelAnimationFrame(rafId);
    }
    function sync() {
      if (!document.hidden && heroVisible) start(); else stop();
    }
    document.addEventListener("visibilitychange", sync);
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.05 }).observe(document.querySelector(".hero"));
    sync();
  }

  /* ------------------------------------------------- reveal on scroll */

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("on");
      io.unobserve(en.target);
      if (en.target.querySelector("[data-count]")) runCounters(en.target);
    });
  }, { threshold: 0.22 });
  document.querySelectorAll(".rv, .nights, .war").forEach(function (el) {
    io.observe(el);
  });

  function runCounters(root) {
    root.querySelectorAll("[data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
      if (reduced) { el.textContent = target.toFixed(dec); return; }
      var start = null, dur = 1100;
      function tick(now) {
        if (start === null) start = now;
        var u = ease(clamp01((now - start) / dur));
        el.textContent = (target * u).toFixed(dec);
        if (u < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
})();

/* War room — Claude-style shift chat that plays the real night. */
(function () {
  var root = document.getElementById("war");
  var stream = document.getElementById("war-stream");
  if (!root || !stream) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var statusEl = document.getElementById("war-status");
  var titleEl = document.getElementById("war-title");
  var clockEl = document.getElementById("war-clock");
  var stepsEl = document.getElementById("war-steps");
  var aspects = document.getElementById("war-aspects");
  var playing = false;
  var timer = 0;

  var NIGHTS = {
    "3": {
      title: "Night 3 · started from memory",
      clock: "17:19:23",
      events: [
        { kind: "pager", who: "pager", text: "Revenue dashboard showing zero for last week. Fine at yesterday's close. Finance noticed first.", step: null, wait: 500 },
        { kind: "agent", who: "nightshift", text: "Recalling prior nights on this asset before I walk anything.", step: "recall", wait: 700 },
        { kind: "tool", name: "recall_incident_memory", tone: "memory", detail: "Essential_KPI_Measures · 2 prior postmortems", step: "recall", aspect: null, wait: 650 },
        { kind: "agent", who: "nightshift", text: "Known break. Two catalog reads, then write-back. No lineage re-walk.", step: "lineage", wait: 700 },
        { kind: "tool", name: "list_schema_fields", tone: "tool", detail: "orders · only order_amount (renamed from order_total)", step: "lineage", wait: 550 },
        { kind: "tool", name: "get_entities", tone: "tool", detail: "dbt order_details · still selects o.order_total", step: "diagnose", wait: 550 },
        { kind: "agent", who: "nightshift", text: "One root cause: deployed model never got the alias. Opening the incident.", step: "diagnose", wait: 650 },
        { kind: "tool", name: "open_incident → resolve", tone: "write", detail: "045d5439 · revenue zeroed overnight", step: "remember", aspect: "incident", wait: 500 },
        { kind: "tool", name: "remember_incident", tone: "memory", detail: "silent-schema-change · written to docs + JSON + tag", step: "remember", aspect: "doc,memory,tag", wait: 550 },
        { kind: "tool", name: "guard_column", tone: "write", detail: "order_details.order_total · presence assertion", step: "remember", aspect: "guard", wait: 500 },
        { kind: "tool", name: "open_fix_pr", tone: "write", detail: "draft · o.order_amount AS order_total", step: "fix", aspect: "pr", wait: 550 },
        { kind: "report", who: "morning report", text: "Started from memory. 5 investigation calls. 1.1 min wall-clock. No lineage re-walked. Graph smarter than tonight found it.", step: "fix", wait: 0 },
      ],
    },
    "1": {
      title: "Night 1 · cold start",
      clock: "17:13:32",
      events: [
        { kind: "pager", who: "pager", text: "Revenue dashboard showing zero for last week. Finance noticed before we did.", step: null, wait: 500 },
        { kind: "agent", who: "nightshift", text: "No memory on this asset. Walking lineage from the dashboard.", step: "recall", wait: 700 },
        { kind: "tool", name: "get_lineage", tone: "tool", detail: "PowerBI → order_details → orders", step: "lineage", wait: 600 },
        { kind: "tool", name: "list_schema_fields", tone: "tool", detail: "orders · order_total gone, order_amount present", step: "lineage", wait: 550 },
        { kind: "tool", name: "get_dataset_queries", tone: "tool", detail: "dbt still selects o.order_total", step: "diagnose", wait: 550 },
        { kind: "agent", who: "nightshift", text: "Silent upstream rename. One cause. Writing it into the graph.", step: "diagnose", wait: 650 },
        { kind: "tool", name: "open_incident → resolve", tone: "write", detail: "c9f3ffe7", step: "remember", aspect: "incident", wait: 500 },
        { kind: "tool", name: "remember_incident", tone: "memory", detail: "first postmortem on this failure mode", step: "remember", aspect: "doc,memory,tag", wait: 550 },
        { kind: "tool", name: "guard_column", tone: "write", detail: "order_details.order_total", step: "remember", aspect: "guard", wait: 500 },
        { kind: "tool", name: "open_fix_pr", tone: "write", detail: "draft fix PR", step: "fix", aspect: "pr", wait: 550 },
        { kind: "report", who: "morning report", text: "Cold night. 14 investigation calls. 2.2 min. Full lineage walked once so the next night never has to.", step: "fix", wait: 0 },
      ],
    },
  };

  function resetAspects() {
    if (!aspects) return;
    aspects.querySelectorAll("li").forEach(function (li) {
      li.classList.remove("is-on");
      li.querySelector("b").textContent = "—";
    });
  }

  function lightAspect(keys) {
    if (!aspects || !keys) return;
    keys.split(",").forEach(function (key) {
      var li = aspects.querySelector('[data-aspect="' + key + '"]');
      if (!li) return;
      li.classList.add("is-on");
      li.querySelector("b").textContent = "written";
    });
  }

  function setStep(name) {
    if (!stepsEl || !name) return;
    var reached = false;
    stepsEl.querySelectorAll(".war__step").forEach(function (el) {
      var id = el.getAttribute("data-step");
      el.classList.remove("is-on");
      if (id === name) {
        el.classList.add("is-on");
        el.classList.add("is-done");
        reached = true;
      } else if (!reached) {
        el.classList.add("is-done");
      }
    });
  }

  function clearSteps() {
    if (!stepsEl) return;
    stepsEl.querySelectorAll(".war__step").forEach(function (el) {
      el.classList.remove("is-on", "is-done");
    });
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function appendEvent(ev) {
    var node;
    if (ev.kind === "tool") {
      node = el("div", "msg msg--tool");
      node.innerHTML =
        '<div class="msg__who">tool</div>' +
        '<div class="msg__tool">' +
        '<span class="msg__tool-name' +
        (ev.tone === "memory" ? " is-memory" : "") +
        (ev.tone === "write" ? " is-write" : "") +
        '">' + ev.name + "</span>" +
        '<span class="msg__tool-detail">' + ev.detail + "</span>" +
        "</div>";
    } else {
      var role =
        ev.kind === "pager" ? "pager" : ev.kind === "report" ? "report" : "agent";
      node = el("div", "msg msg--" + role);
      node.appendChild(el("div", "msg__who", ev.who));
      node.appendChild(el("div", "msg__body", ev.text));
    }
    stream.appendChild(node);
    requestAnimationFrame(function () { node.classList.add("on"); });
    stream.scrollTop = stream.scrollHeight;
    if (ev.step) setStep(ev.step);
    if (ev.aspect) lightAspect(ev.aspect);
  }

  function stopPlay() {
    playing = false;
    if (timer) { clearTimeout(timer); timer = 0; }
  }

  function play(nightKey, instant) {
    stopPlay();
    var night = NIGHTS[nightKey] || NIGHTS["3"];
    stream.innerHTML = "";
    resetAspects();
    clearSteps();
    if (titleEl) titleEl.textContent = night.title;
    if (clockEl) clockEl.textContent = night.clock;
    if (statusEl) {
      statusEl.textContent = instant ? "done" : "live";
      statusEl.className = "war__status " + (instant ? "is-done" : "is-live");
    }

    if (instant) {
      night.events.forEach(appendEvent);
      if (statusEl) {
        statusEl.textContent = "done";
        statusEl.className = "war__status is-done";
      }
      return;
    }

    playing = true;
    var i = 0;
    function next() {
      if (!playing) return;
      if (i >= night.events.length) {
        if (statusEl) {
          statusEl.textContent = "done";
          statusEl.className = "war__status is-done";
        }
        playing = false;
        return;
      }
      var ev = night.events[i++];
      appendEvent(ev);
      timer = setTimeout(next, ev.wait || 480);
    }
    next();
  }

  document.querySelectorAll(".war__thread").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".war__thread").forEach(function (b) {
        b.classList.toggle("is-on", b === btn);
      });
      play(btn.getAttribute("data-night"), reduced);
    });
  });

  var started = false;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !started) {
        started = true;
        play("3", reduced);
      }
    });
  }, { threshold: 0.25 });
  io.observe(root);
})();

/* Sentinel journal */
(function () {
  var log = document.getElementById("watch-log");
  if (!log) return;
  var LINES = [
    { t: "03:12:41", ds: "orders", msg: "fingerprint ok", c: "ok" },
    { t: "03:14:41", ds: "order_details", msg: "fingerprint ok", c: "ok" },
    { t: "03:16:41", ds: "fct_revenue", msg: "fingerprint ok", c: "ok" },
    { t: "03:18:41", ds: "orders", msg: "column gone: order_total", c: "drift" },
    { t: "03:18:42", ds: "☽ nightshift", msg: "waking the shift · trigger: sentinel", c: "wake" },
    { t: "03:20:07", ds: "orders", msg: "incident resolved · guard posted", c: "done" },
  ];
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function render(instant) {
    log.innerHTML = "";
    LINES.forEach(function (l, i) {
      var d = document.createElement("div");
      d.className = "wl " + l.c + (instant ? " on" : "");
      d.innerHTML =
        '<span class="t">' + l.t + '</span><span class="ds">' + l.ds +
        '</span><span class="msg">' + l.msg + "</span>";
      log.appendChild(d);
      if (!instant) setTimeout(function () { d.classList.add("on"); }, 600 + i * 950);
    });
  }
  if (reduced) { render(true); return; }
  var seen = false;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !seen) {
        seen = true;
        render(false);
        setInterval(function () { render(false); }, 14000);
      }
    });
  }, { threshold: 0.3 });
  io.observe(log);
})();
