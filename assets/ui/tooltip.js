// assets/tooltip.js

let activeTooltip = null;

// iOS scroll-freeze state
let savedScrollY = 0;

function isMobile() {
  return window.matchMedia("(max-width: 520px)").matches;
}

function freezeBodyScroll() {
  savedScrollY = window.scrollY || 0;

  document.body.style.position = "fixed";
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unfreezeBodyScroll() {
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";

  window.scrollTo(0, savedScrollY);
}

function removeListeners() {
  document.removeEventListener("pointerdown", handleOutside, true);
  document.removeEventListener("touchstart", handleOutside, true);
  document.removeEventListener("click", handleOutside, true);
  document.removeEventListener("keydown", handleEsc, true);
  window.removeEventListener("resize", closeTooltip, true);
  window.removeEventListener("scroll", closeTooltip, true);
}

export function closeTooltip() {
  if (!activeTooltip) return;

  const wasMobile = activeTooltip.classList.contains("tooltip--mobile");

  activeTooltip.remove();
  activeTooltip = null;

  document.body.classList.remove("modal-open");
  if (wasMobile) unfreezeBodyScroll();

  removeListeners();
}

function handleOutside(e) {
  if (!activeTooltip) return;

  const anchor = activeTooltip._anchorEl;

  // Tap inside tooltip → keep open
  if (activeTooltip.contains(e.target)) return;

  // Tap on anchor button → keep open
  if (anchor && anchor.contains(e.target)) return;

  closeTooltip();
}

function handleEsc(e) {
  if (e.key === "Escape") closeTooltip();
}

export function openTooltip(anchorEl, { title, body }) {
  closeTooltip();

  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.setAttribute("role", "dialog");
  tip.setAttribute("aria-label", title);

  const paragraphs = String(body || "")
    .trim()
    .split("\n\n")
    .map((p) => `<p>${String(p).trim()}</p>`)
    .join("");

  tip.innerHTML = `
    <div class="tooltipInner">
      <div class="tooltipTitle">${title}</div>
      <div class="tooltipBody">${paragraphs}</div>
    </div>
  `;

  tip._anchorEl = anchorEl;
  document.body.appendChild(tip);

  // Reset inline styles
  tip.style.top = "";
  tip.style.left = "";
  tip.style.right = "";
  tip.style.bottom = "";
  tip.style.transform = "";

  const mobile = isMobile();

  if (mobile) {
    tip.classList.add("tooltip--mobile");
    document.body.classList.add("modal-open");
    freezeBodyScroll();
  } else {
    const rect = anchorEl.getBoundingClientRect();
    const margin = 10;

    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;

    const fitsBelow = rect.bottom + margin + tipH < window.innerHeight;
    const top = fitsBelow ? rect.bottom + margin : rect.top - margin - tipH;

    const left = Math.min(
      window.innerWidth - tipW - 12,
      Math.max(12, rect.left)
    );

    tip.style.top = `${Math.max(12, top)}px`;
    tip.style.left = `${left}px`;

    window.addEventListener("scroll", closeTooltip, true);
  }

  activeTooltip = tip;

  // PWA/iOS reliable close listeners
  document.addEventListener("pointerdown", handleOutside, true);
  document.addEventListener("touchstart", handleOutside, true);
  document.addEventListener("click", handleOutside, true);

  document.addEventListener("keydown", handleEsc, true);
  window.addEventListener("resize", closeTooltip, true);
}