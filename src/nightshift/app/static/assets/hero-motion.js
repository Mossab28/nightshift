/* Hero entrance - Motion via ESM, sober word fade (not letter scramble).
   Falls back silently if the CDN is blocked. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const headline = document.getElementById("headline");

function revealStatic() {
  if (headline) headline.classList.remove("is-pending");
}

if (!headline || reduced) {
  revealStatic();
} else {
  headline.classList.add("is-pending");
  try {
    const { animate, stagger } = await import("https://esm.sh/motion@12.23.12");
    await document.fonts.ready.catch(() => {});

    function splitWords(el) {
      const text = el.textContent || "";
      el.setAttribute("aria-label", text);
      el.textContent = "";
      const words = text.split(/(\s+)/);
      const nodes = [];
      for (const part of words) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          el.appendChild(document.createTextNode(part));
          continue;
        }
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = part;
        el.appendChild(span);
        nodes.push(span);
      }
      return nodes;
    }

    const dim = headline.querySelector("[data-split]");
    const ink = headline.querySelector("[data-split-ink]");
    if (!dim || !ink) {
      revealStatic();
    } else {
      const dimWords = splitWords(dim);
      const inkWords = splitWords(ink);
      requestAnimationFrame(() => {
        headline.classList.remove("is-pending");
        animate(
          dimWords,
          { opacity: [0, 1], y: [14, 0] },
          { duration: 0.7, delay: stagger(0.06, { startDelay: 0.05 }), easing: [0.22, 1, 0.36, 1] }
        );
        animate(
          inkWords,
          { opacity: [0, 1], y: [16, 0] },
          { duration: 0.75, delay: stagger(0.08, { startDelay: 0.35 }), easing: [0.22, 1, 0.36, 1] }
        );
      });
    }
  } catch (_) {
    revealStatic();
  }
}
