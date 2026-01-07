import { $ } from "./dom.js";
import { getDayType, getPhase } from "../core/cycle.js";

export function initUI(state, store, cycle) {
  const bigDay = $("bigDay");
  const headerTitle = $("headerTitle");
  const headerPhase = $("headerPhase");
  const todayCard = $("todayCard");

  if (!cycle) {
    headerTitle.textContent = "Day — / 36";
    headerPhase.textContent = "Open Settings and enter your date of birth.";
    return;
  }

  const today = state.dayInCycle;
  const phase = getPhase(today);

  bigDay.innerHTML = `Day ${today} <small>/ 36</small>`;
  headerTitle.textContent = `Day ${today} / 36`;
  headerPhase.textContent = phase.name;

  const type = getDayType(today);
  if (todayCard) {
    todayCard.classList.remove("light", "anchor", "echo");
    todayCard.classList.add(type);
  }

  const yearNow = $("yearNow");
  if (yearNow) yearNow.textContent = String(new Date().getFullYear());
}
