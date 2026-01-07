let activeTooltip = null;

export function closeTooltip() {
  if (!activeTooltip) return;
  activeTooltip.remove();
  activeTooltip = null;
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

  const paragraphs = body
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

  const rect = anchorEl.getBoundingClientRect();
  const margin = 10;
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;

  const fitsBelow = rect.bottom + margin + tipH < window.innerHeight;
  const top = fitsBelow ? rect.bottom + margin : rect.top - margin - tipH;
  const left = Math.min(window.innerWidth - tipW - 12, Math.max(12, rect.left));

  tip.style.top = `${top + window.scrollY}px`;
  tip.style.left = `${left + window.scrollX}px`;

  activeTooltip = tip;

  document.addEventListener("mousedown", handleOutsideClick, true);
  document.addEventListener("keydown", handleEsc, true);
  window.addEventListener("resize", closeTooltip, true);
  window.addEventListener("scroll", closeTooltip, true);
}