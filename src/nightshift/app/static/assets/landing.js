/* Nightshift landing — the constellation that learns.
   One canvas, one 22s loop, two cycles of the same break:
   cycle A the shift investigates and repairs; a green ring (the guard) stays.
   cycle B the same break starts — and is caught instantly. The animation is the pitch. */

(function () {
  "use strict";

  var COLORS = {
    dim: [232, 232, 232],
    red: [255, 107, 107],
    green: [95, 210, 154],
    violet: [185, 138, 255],
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------ deterministic graph */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rnd = mulberry32(2047); // 2:47am
  var N = 34;
  var nodes = [];
  var edges = []; // {a, b} directed a -> b (a upstream)

  // Organic layout: nodes scattered with a loose left-to-right flow,
  // each connecting to 1-2 nearby upstream nodes.
  for (var i = 0; i < N; i++) {
    var fx = 0.06 + 0.88 * (i / (N - 1));
    nodes.push({
      x: fx + (rnd() - 0.5) * 0.12,
      y: 0.14 + 0.72 * rnd(),
      r: 1.4 + rnd() * 1.6,
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
    var links = 1 + (rnd() < 0.4 ? 1 : 0);
    for (var l = 0; l < links && l < cands.length; l++) {
      edges.push({ a: cands[l].k, b: j });
    }
  }

  // The break: an upstream node with a real downstream tree.
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
  // Master loop: 22s.
  //  cycle A: 0.0 calm | 2.5 break | red wave to depth 3 | 4.8 violet pulse
  //           5.8 green retrace heals deepest-first | 8.2 ring lands | calm
  //  cycle B: 14.0 same break | green catches it in under a second | calm
  //  21.0-22.0 ring dissolves so the loop restarts clean.
  var LOOP = 22;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }

  // How red a node of given depth is at loop-time t. Returns 0..1.
  function redness(t, d) {
    if (d === undefined) return 0;
    var r = 0;
    // cycle A: wave leaves origin at 2.5, ~0.5s per hop, healed by green retrace
    var hitA = 2.5 + d * 0.5;
    var healA = 5.8 + (maxDepth - d) * 0.55; // deepest heals first, origin last
    r = Math.max(r, ease((t - hitA) / 0.35) * (1 - ease((t - healA) / 0.5)));
    // cycle B: wave starts at 14.0 but green catches it almost immediately
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

  function violet(t) { // memory pulse near origin, cycle A + a flicker in B
    var a = ease((t - 4.8) / 0.4) * (1 - ease((t - 6.2) / 0.6));
    var b = ease((t - 14.15) / 0.15) * (1 - ease((t - 14.9) / 0.3));
    return Math.max(a, b);
  }

  function ringAlpha(t) { // the guard: lands at 8.2, persists, dissolves 21-22
    return ease((t - 8.2) / 0.8) * (1 - ease((t - 21) / 1));
  }

  /* --------------------------------------------------------- rendering */

  var canvas = document.getElementById("sky");
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

  function draw(now) {
    var t = (now / 1000) % LOOP;
    var breath = 0.5 + 0.5 * Math.sin(now / 1000 * 0.5);
    ctx.clearRect(0, 0, W, H);

    var P = nodes.map(function (n) { return pos(n, now / 1000); });

    // edges
    edges.forEach(function (e) {
      var ra = Math.max(redness(t, depth[e.a]), redness(t, depth[e.b]) * 0.7);
      var ga = Math.max(greenness(t, depth[e.a]), greenness(t, depth[e.b])) * 0.8;
      var base = 0.05 + breath * 0.02;
      ctx.beginPath();
      ctx.moveTo(P[e.a].x, P[e.a].y);
      ctx.lineTo(P[e.b].x, P[e.b].y);
      ctx.lineWidth = 1;
      if (ra > 0.02 || ga > 0.02) {
        var c = ga > ra ? COLORS.green : COLORS.red;
        ctx.strokeStyle = rgba(c, base + Math.max(ra, ga) * 0.5);
      } else {
        ctx.strokeStyle = "rgba(255,255,255," + base + ")";
      }
      ctx.stroke();
    });

    // traveling pulses along affected edges (red downstream / green back up)
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
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.c, 0.9);
        ctx.shadowColor = rgba(p.c, 0.8);
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });

    // nodes
    nodes.forEach(function (n, idx) {
      var r = redness(t, depth[idx]);
      var g = greenness(t, depth[idx]);
      var c = COLORS.dim;
      if (r > g) c = mix(COLORS.dim, COLORS.red, r);
      else if (g > 0) c = mix(COLORS.dim, COLORS.green, g);
      var alpha = 0.35 + breath * 0.1 + Math.max(r, g) * 0.55;
      ctx.beginPath();
      ctx.arc(P[idx].x, P[idx].y, n.r + Math.max(r, g) * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(c, alpha);
      if (r > 0.1 || g > 0.1) {
        ctx.shadowColor = rgba(c, 0.7);
        ctx.shadowBlur = 10;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // memory pulse (violet) beside the origin node
    var v = violet(t);
    if (v > 0.01) {
      var o = P[ORIGIN];
      var pr = 3 + v * 4;
      ctx.beginPath();
      ctx.arc(o.x + 14, o.y - 12, pr, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.violet, v * 0.9);
      ctx.shadowColor = rgba(COLORS.violet, 0.8);
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // the guard ring
    var ra = ringAlpha(t);
    if (ra > 0.01) drawRing(P[ORIGIN], nodes[ORIGIN].r, ra);
  }

  function drawRing(p, r, alpha) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 7, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba(COLORS.green, 0.7 * alpha);
    ctx.shadowColor = rgba(COLORS.green, 0.5 * alpha);
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawStatic() {
    // reduced motion: calm sky, guard already in place
    ctx.clearRect(0, 0, W, H);
    var P = nodes.map(function (n) { return { x: n.x * W, y: n.y * H }; });
    edges.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(P[e.a].x, P[e.a].y);
      ctx.lineTo(P[e.b].x, P[e.b].y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.stroke();
    });
    nodes.forEach(function (n, idx) {
      ctx.beginPath();
      ctx.arc(P[idx].x, P[idx].y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232,232,232,0.4)";
      ctx.fill();
    });
    drawRing(P[ORIGIN], nodes[ORIGIN].r, 1);
  }

  /* --------------------------------------------- run loop, pause smart */

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

  /* -------------------------------------------------- wordmark stagger */

  var wm = document.getElementById("wordmark");
  var text = "NIGHTSHIFT";
  var frag = document.createDocumentFragment();
  var moon = document.createElement("span");
  moon.className = "lt moon-glyph";
  moon.textContent = "☽";
  moon.style.animationDelay = "200ms";
  frag.appendChild(moon);
  frag.appendChild(document.createTextNode(" "));
  for (var ci = 0; ci < text.length; ci++) {
    var s = document.createElement("span");
    s.className = "lt";
    s.textContent = text[ci];
    s.style.animationDelay = 280 + ci * 40 + "ms";
    frag.appendChild(s);
  }
  wm.textContent = "";
  wm.appendChild(frag);

  /* ------------------------------------------------- reveal on scroll */

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("on");
      io.unobserve(en.target);
      if (en.target.querySelector("[data-count]")) runCounters(en.target);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll(".rv, .shift, .nights, .figure").forEach(function (el) { io.observe(el); });

  /* ------------------------------------------------- animated counters */

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

/* Le journal du Sentinel : la bande raconte la détection en boucle. */
(function () {
  var log = document.getElementById('watch-log');
  if (!log) return;
  var LINES = [
    { t: '03:12:41', ds: 'orders', msg: 'fingerprint ok', c: 'ok' },
    { t: '03:14:41', ds: 'order_details', msg: 'fingerprint ok', c: 'ok' },
    { t: '03:16:41', ds: 'fct_revenue', msg: 'fingerprint ok', c: 'ok' },
    { t: '03:18:41', ds: 'orders', msg: 'column gone: order_total', c: 'drift' },
    { t: '03:18:42', ds: '☽ nightshift', msg: 'waking the shift · trigger: sentinel', c: 'wake' },
    { t: '03:20:07', ds: 'orders', msg: 'incident resolved · guard posted', c: 'done' }
  ];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render(instant) {
    log.innerHTML = '';
    LINES.forEach(function (l, i) {
      var d = document.createElement('div');
      d.className = 'wl ' + l.c + (instant ? ' on' : '');
      d.innerHTML = '<span class="t">' + l.t + '</span><span class="ds">' + l.ds +
        '</span><span class="msg">' + l.msg + '</span>';
      log.appendChild(d);
      if (!instant) setTimeout(function () { d.classList.add('on'); }, 600 + i * 950);
    });
  }
  if (reduced) { render(true); return; }
  var seen = false;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !seen) { seen = true; render(false); setInterval(function () { render(false); }, 14000); }
    });
  }, { threshold: 0.3 });
  io.observe(log);
})();
