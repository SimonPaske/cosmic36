import { $ } from "../ui/dom.js";

export function renderAside(state) {
  if (!state || state.layout !== "desktop") return;
  const asideText = $("asideText");
  const kv = $("kv");
  if (!asideText || !kv || !state.cycle) return;

  const doneCount = Object.values(state.cycle.done || {}).filter(Boolean).length;
  asideText.textContent = "Perspective metrics (not pressure).";
  kv.innerHTML = `
    <div class="row"><span>Total days on Earth</span><b>${state.daysLived.toLocaleString()}</b></div>
    <div class="row"><span>Total hours</span><b>${state.hoursLived.toLocaleString()}</b></div>
    <div class="row"><span>Marked this cycle</span><b>${doneCount} / 36</b></div>
    <div class="row"><span>Cycle started</span><b>${state.cycleStartYMD}</b></div>
  `;
}
