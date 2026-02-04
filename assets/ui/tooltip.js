// assets/tooltip.js

let activeTooltip = null;

function isMobile() {
  return window.matchMedia("(max-width: 520px)").matches;
}

export function closeTooltip() {
  if (!activeTooltip) return;

  activeTooltip.remove();
  activeTooltip = null;

  // Remove mobile backdrop/scroll lock if used
  document.body.classList.remove("modal-open");

  document.removeEventListener("mousedown", handleOutsideClick, true);
  document.removeEventListener("keydown", handleEsc, true);
  window.removeEventListener("resize", closeTooltip, true);
  window.removeEventListener("scroll", closeTooltip, true);
}

function handleOutsideClick(e) {
  if (!activeTooltip) return;
  const anchor = activeTooltip._anchorEl;

  // Tap inside tooltip → keep open
  if (activeTooltip.contains(e.target)) return;

  // Tap on anchor → keep open (prevents instant close when user taps ⓘ)
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

  // Always reset inline positioning so we don't carry state across opens
  tip.style.top = "";
  tip.style.left = "";
  tip.style.right = "";
  tip.style.bottom = "";
  tip.style.transform = "";

  if (isMobile()) {
    // ✅ Mobile: pin to viewport top with equal margins (inset)
    // Actual spacing handled by CSS class (.tooltip--mobile)
    tip.classList.add("tooltip--mobile");

    // Optional: lock background scroll + show backdrop (CSS below)
    document.body.classList.add("modal-open");
  } else {
    // ✅ Desktop: anchor-based positioning (your original intent)
    const rect = anchorEl.getBoundingClientRect();
    const margin = 10;

    // Need tooltip size after append
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;

    // Prefer below if it fits; otherwise above
    const fitsBelow = rect.bottom + margin + tipH < window.innerHeight;
    const top = fitsBelow ? rect.bottom + margin : rect.top - margin - tipH;

    // Clamp horizontally into viewport
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