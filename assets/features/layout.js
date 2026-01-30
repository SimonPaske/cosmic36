import { $ } from "../ui/dom.js";

export function applyLayout(state) {
  document.documentElement.dataset.layout = state.layout;
  const layoutBtn = $("layoutBtn");
  if (layoutBtn) layoutBtn.textContent = state.layout === "desktop" ? "Mobile view" : "Desktop view";
  const lifeAside = $("lifeAside");
  if (lifeAside) lifeAside.hidden = state.layout !== "desktop";
  const swipeHint = $("swipeHint");
  if (swipeHint) swipeHint.style.display = state.layout === "desktop" ? "none" : "flex";
}

export function applyExperience(state) {
  document.documentElement.dataset.experience = state.experience;
  document.documentElement.dataset.density = state.density || "minimal";
  const extrasWrap = $("extrasWrap");
  if (extrasWrap) extrasWrap.hidden = state.experience !== "complete";
  const detailsIntention = $("detailsIntention");
  const detailsReflection = $("detailsReflection");
  const detailsClose = $("detailsClose");
  const shouldOpen = state.experience === "complete";
  [detailsIntention, detailsReflection, detailsClose].forEach((el) => {
    if (!el) return;
    if (shouldOpen) el.setAttribute("open", "");
    else el.removeAttribute("open");
  });
}
