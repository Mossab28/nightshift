/* Landing motion - hero + CTA word fades via Motion ESM.
   Falls back silently if the CDN is blocked. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function splitWords(el) {
  const text = el.textContent || "";
  el.setAttribute("aria-label", text);
  el.textContent = "";
  const nodes = [];
  for (const part of text.split(/(\s+)/)) {
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

function reveal(el) {
  if (el) el.classList.remove("is-pending");
}

async function loadMotion() {
  const mod = await import("https://esm.sh/motion@12.23.12");
  await document.fonts.ready.catch(() => {});
  return mod;
}

async function runHero(animate, stagger) {
  const headline = document.getElementById("headline");
  if (!headline) return;
  const dim = headline.querySelector("[data-split]");
  const ink = headline.querySelector("[data-split-ink]");
  if (!dim || !ink) {
    reveal(headline);
    return;
  }
  headline.classList.add("is-pending");
  const dimWords = splitWords(dim);
  const inkWords = splitWords(ink);
  requestAnimationFrame(() => {
    reveal(headline);
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

async function runCta(animate, stagger) {
  const stage = document.getElementById("cta-stage");
  const headline = document.getElementById("cta-headline");
  if (!stage || !headline) return;

  const play = () => {
    if (stage.classList.contains("is-played")) return;
    stage.classList.add("is-played");
    const split = headline.querySelector("[data-cta-split]");
    const words = split ? splitWords(split) : [];
    headline.classList.remove("is-pending");
    stage.querySelectorAll(".cta-item").forEach((el) => el.classList.add("is-on"));
    if (words.length) {
      animate(
        words,
        { opacity: [0, 1], y: [16, 0] },
        { duration: 0.7, delay: stagger(0.07, { startDelay: 0.08 }), easing: [0.22, 1, 0.36, 1] }
      );
    }
    const actions = stage.querySelectorAll(".cta-actions .btn");
    if (actions.length) {
      animate(
        actions,
        { opacity: [0, 1], y: [18, 0] },
        { duration: 0.55, delay: stagger(0.1, { startDelay: 0.45 }), easing: [0.22, 1, 0.36, 1] }
      );
    }
  };

  if (reduced) {
    headline.classList.remove("is-pending");
    stage.classList.add("is-played");
    stage.querySelectorAll(".cta-item").forEach((el) => el.classList.add("is-on"));
    return;
  }

  headline.classList.add("is-pending");
  new IntersectionObserver(
    (entries) => {
      if (entries[0] && entries[0].isIntersecting) play();
    },
    { threshold: 0.35 }
  ).observe(stage);
}

if (reduced) {
  reveal(document.getElementById("headline"));
  const stage = document.getElementById("cta-stage");
  if (stage) {
    stage.classList.add("is-played");
    stage.querySelectorAll(".cta-item").forEach((el) => el.classList.add("is-on"));
  }
  const ctaH = document.getElementById("cta-headline");
  if (ctaH) ctaH.classList.remove("is-pending");
} else {
  try {
    const { animate, stagger } = await loadMotion();
    await runHero(animate, stagger);
    await runCta(animate, stagger);
  } catch (_) {
    reveal(document.getElementById("headline"));
    const stage = document.getElementById("cta-stage");
    if (stage) {
      stage.classList.add("is-played");
      stage.querySelectorAll(".cta-item").forEach((el) => el.classList.add("is-on"));
    }
    const ctaH = document.getElementById("cta-headline");
    if (ctaH) ctaH.classList.remove("is-pending");
  }
}
