// assets/tooltip.js

let activeTooltip = null;

function isMobile() {
  return window.matchMedia("(max-width: 520px)").matches;
}

export function closeTooltip() {
  if (!activeTooltip) return;

  activeTooltip.remove();
  activeTooltip = null;

  document.body.classList.remove("modal-open");

  document.removeEventListener("mousedown", handleOutsideClick, true);
  document.removeEventListener("keydown", handleEsc, true);
  window.removeEventListener("resize", closeTooltip, true);
  window.removeEventListener("scroll", closeTooltip, true);
}

function handleOutsideClick(e) {
  if (!activeTooltip) return;
  const anchor = activeTooltip._anchorEl;

  if (activeTooltip.contains(e.target)) return;
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

  if (isMobile()) {
    // Mobile: fullscreen inset panel with margins
    tip.classList.add("tooltip--mobile");
    document.body.classList.add("modal-open");
  } else {
    // Desktop: position near anchor
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
  }

  activeTooltip = tip;

  document.addEventListener("mousedown", handleOutsideClick, true);
  document.addEventListener("keydown", handleEsc, true);
  window.addEventListener("resize", closeTooltip, true);
  window.addEventListener("scroll", closeTooltip, true);
}