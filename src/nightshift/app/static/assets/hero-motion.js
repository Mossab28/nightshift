/* Hero kinetic type - Motion (motion.dev) via ESM.
 Boutique choice for vanilla: spring stagger + night scramble on "lookup." */

import { animate, stagger } from "https://esm.sh/motion@12.23.12";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const headline = document.getElementById("headline");
if (!headline || reduced) {
 /* nothing - landing.js constellation still runs */
} else {
 await document.fonts.ready.catch(() => {});

 function splitChars(el) {
 const text = el.textContent || "";
 el.setAttribute("aria-label", text);
 el.textContent = "";
 const chars = [];
 for (const ch of text) {
 const span = document.createElement("span");
 span.className = "char";
 span.textContent = ch === " " ? "\u00a0" : ch;
 el.appendChild(span);
 chars.push(span);
 }
 return chars;
 }

 const dim = headline.querySelector("[data-split]");
 const ink = headline.querySelector("[data-split-ink]");
 if (dim && ink) {
 headline.classList.add("is-pending");
 const dimChars = splitChars(dim);
 const inkChars = splitChars(ink);

 requestAnimationFrame(() => {
 headline.classList.remove("is-pending");
 animate(
 dimChars,
 { opacity: [0, 1], y: [18, 0], filter: ["blur(8px)", "blur(0px)"] },
 { duration: 0.85, delay: stagger(0.028, { startDelay: 0.08 }), easing: [0.22, 1, 0.36, 1] }
 );
 animate(
 inkChars,
 {
 opacity: [0, 1],
 y: [22, 0],
 filter: ["blur(10px)", "blur(0px)"],
 scale: [0.92, 1],
 },
 {
 duration: 0.95,
 delay: stagger(0.045, { startDelay: 0.55 }),
 easing: [0.16, 1, 0.3, 1],
 }
 );

 /* Soft moon pulse on "lookup." after settle */
 animate(
 inkChars,
 { textShadow: ["0 0 0px rgba(255,215,110,0)", "0 0 32px rgba(255,215,110,0.45)", "0 0 18px rgba(255,215,110,0.2)"] },
 { duration: 2.4, delay: 1.4, easing: "ease-in-out" }
 );
 });
 }
}
