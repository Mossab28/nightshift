/* Nightshift product tour — Murmell/IntrudR cutout: veil, lit frame, one card. */
(function (global) {
  "use strict";

  var KEY = "nightshift.tour.v1";
  var PAD = 10;
  var root = null;
  var step = 0;
  var ro = null;

  var STEPS = [
    {
      target: '[data-tour="wake"]',
      title: "Wake the night shift",
      body: "Describe what broke and point at the dataset. The agent takes the pager from here.",
    },
    {
      target: '[data-tour="nav-shifts"]',
      title: "Shifts",
      body: "Every night the agent worked. Open one to watch the conversation live.",
      hash: "#/shifts",
    },
    {
      target: '[data-tour="nav-memory"]',
      title: "Memory",
      body: "What previous nights wrote into DataHub. This is why night two is a lookup.",
      hash: "#/memory",
    },
    {
      target: '[data-tour="nav-settings"]',
      title: "Settings",
      body: "Connect your DataHub, then turn on the Sentinel so a schema drift wakes the shift alone.",
      hash: "#/settings",
    },
    {
      target: '[data-tour="conn"]',
      title: "DataHub connection",
      body: "GMS URL of your catalog. Without this, the agent has nowhere to read or write.",
      hash: "#/settings",
    },
  ];

  function done() {
    try { localStorage.setItem(KEY, "1"); } catch (_) {}
    teardown();
  }

  function seen() {
    try { return localStorage.getItem(KEY) === "1"; } catch (_) { return true; }
  }

  function teardown() {
    if (ro) { window.removeEventListener("resize", paint); window.removeEventListener("scroll", paint, true); ro = null; }
    if (root) { root.remove(); root = null; }
    document.documentElement.removeAttribute("data-tour");
  }

  function measure(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return {
      left: Math.max(8, r.left - PAD),
      top: Math.max(8, r.top - PAD),
      width: Math.min(window.innerWidth - 16, r.width + PAD * 2),
      height: Math.min(window.innerHeight - 16, r.height + PAD * 2),
    };
  }

  function placeCard(rect, card) {
    var cw = card.offsetWidth || 320;
    var ch = card.offsetHeight || 120;
    var left = rect.left + rect.width / 2 - cw / 2;
    var top = rect.top + rect.height + 14;
    if (top + ch > window.innerHeight - 16) top = rect.top - ch - 14;
    if (top < 16) top = 16;
    left = Math.max(16, Math.min(left, window.innerWidth - cw - 16));
    card.style.left = left + "px";
    card.style.top = top + "px";
  }

  function paint() {
    if (!root) return;
    var s = STEPS[step];
    if (!s) return;
    var rect = measure(s.target);
    var frame = root.querySelector(".ns-tour__frame");
    var card = root.querySelector(".ns-tour__card");
    var strips = root.querySelectorAll(".ns-tour__strip");
    if (!rect) {
      // Target missing on this view — advance or wait.
      frame.style.opacity = "0";
      return;
    }
    frame.style.opacity = "1";
    frame.style.left = rect.left + "px";
    frame.style.top = rect.top + "px";
    frame.style.width = rect.width + "px";
    frame.style.height = rect.height + "px";

    // Four strips around the hole.
    var W = window.innerWidth, H = window.innerHeight;
    var specs = [
      [0, 0, W, rect.top],
      [0, rect.top, rect.left, rect.height],
      [rect.left + rect.width, rect.top, W - (rect.left + rect.width), rect.height],
      [0, rect.top + rect.height, W, H - (rect.top + rect.height)],
    ];
    specs.forEach(function (box, i) {
      var el = strips[i];
      el.style.left = box[0] + "px";
      el.style.top = box[1] + "px";
      el.style.width = Math.max(0, box[2]) + "px";
      el.style.height = Math.max(0, box[3]) + "px";
    });

    card.querySelector(".ns-tour__title").textContent = s.title;
    card.querySelector(".ns-tour__body").textContent = s.body;
    card.querySelector(".ns-tour__meta").textContent = (step + 1) + " / " + STEPS.length;
    placeCard(rect, card);
  }

  function go(i) {
    step = i;
    var s = STEPS[step];
    if (!s) { done(); return; }
    document.documentElement.setAttribute("data-tour", "step-" + step);
    if (s.hash && location.hash !== s.hash) {
      location.hash = s.hash;
      setTimeout(paint, 80);
      setTimeout(paint, 280);
    } else {
      paint();
    }
  }

  function mount() {
    if (root) return;
    root = document.createElement("div");
    root.className = "ns-tour";
    root.innerHTML =
      '<div class="ns-tour__strip"></div><div class="ns-tour__strip"></div>' +
      '<div class="ns-tour__strip"></div><div class="ns-tour__strip"></div>' +
      '<div class="ns-tour__frame"></div>' +
      '<div class="ns-tour__card">' +
      '  <p class="ns-tour__meta"></p>' +
      '  <p class="ns-tour__title"></p>' +
      '  <p class="ns-tour__body"></p>' +
      '  <div class="ns-tour__actions">' +
      '    <button type="button" class="ns-tour__skip">Skip</button>' +
      '    <button type="button" class="ns-tour__next">Next</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(root);
    root.querySelector(".ns-tour__skip").onclick = done;
    root.querySelector(".ns-tour__next").onclick = function () {
      if (step >= STEPS.length - 1) done();
      else go(step + 1);
    };
    window.addEventListener("resize", paint);
    window.addEventListener("scroll", paint, true);
    ro = true;
    document.addEventListener("keydown", function onKey(e) {
      if (!root) return;
      if (e.key === "Escape") { done(); document.removeEventListener("keydown", onKey); }
      if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        if (step >= STEPS.length - 1) done();
        else go(step + 1);
      }
    });
  }

  function start(force) {
    if (!force && seen()) return;
    if (!document.querySelector('[data-tour="wake"], [data-tour="nav-settings"]')) {
      setTimeout(function () { start(force); }, 200);
      return;
    }
    mount();
    go(0);
  }

  global.NightshiftTour = { start: start, reset: function () {
    try { localStorage.removeItem(KEY); } catch (_) {}
  } };
})(window);
