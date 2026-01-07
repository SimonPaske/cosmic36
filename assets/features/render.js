import { CYCLE_DAYS, ANCHORS, ECHOES, START_WINDOWS } from "../core/constants.js";
import {
  computeCycleMeta,
  computeNextPatternStarts,
  getCycle,
  getDayType,
  getPhase,
  nextSpecialDay
} from "../core/cycle.js";
import { formatYMD } from "../core/time.js";
import { GUIDANCE, INSIGHTS, mindfulPrompt, mindfulTemplate } from "../core/content.js";
import { $ } from "../ui/dom.js";

export function setDoneUI(state, done) {
  const stateDot = $("stateDot");
  const statusBtn = $("statusBtn");
  const statusText = $("statusText");
  if (!stateDot || !statusBtn || !statusText) return;

  stateDot.classList.toggle("done", done);
  statusBtn.setAttribute("aria-pressed", String(done));
  statusText.textContent = state.gentle
    ? (done ? "Marked ✓" : "Not marked")
    : (done ? "Done ✓" : "Not done");
}

function setCardType(type) {
  const todayCard = $("todayCard");
  if (!todayCard) return;
  todayCard.classList.remove("light", "anchor", "echo");
  todayCard.classList.add(type);
}

export function renderMain(state, store) {
  const subLine = $("subLine");
  const headerTitle = $("headerTitle");
  const headerPhase = $("headerPhase");
  const chipRow = $("chipRow");
  const patternLine = $("patternLine");
  const bigDay = $("bigDay");
  const guidanceLine = $("guidanceLine");
  const hintLine = $("hintLine");
  const insightBox = $("insightBox");
  const insightLine = $("insightLine");
  const notePrompt = $("notePrompt");
  const noteBox = $("noteBox");
  const extrasWrap = $("extrasWrap");
  const detailsClose = $("detailsClose");
  const intentionBox = $("intentionBox");
  const reflectionBox = $("reflectionBox");
  const cycleLessonBox = $("cycleLessonBox");
  const cycleCarryBox = $("cycleCarryBox");
  const cycleReleaseBox = $("cycleReleaseBox");

  const meta = computeCycleMeta(state.dobStr, state.mode);
  if (!meta) {
    state.autoMarked = false;

    if (headerTitle) headerTitle.textContent = "Day — / 36";
    if (headerPhase) headerPhase.textContent = "Open Settings and enter your date of birth.";
    if (chipRow) chipRow.innerHTML = "";
    if (patternLine) {
      patternLine.textContent = "";
      patternLine.classList.remove("hasText");
    }
    if (bigDay) bigDay.innerHTML = "Day — <small>/ 36</small>";
    if (guidanceLine) guidanceLine.textContent = "—";
    if (hintLine) hintLine.textContent = "—";
    if (insightBox) insightBox.hidden = true;
    if (notePrompt) notePrompt.textContent = "Mindful note";
    if (noteBox) noteBox.value = "";
    setDoneUI(state, false);
    setCardType("light");
    if (detailsClose) detailsClose.hidden = true;
    if (subLine) subLine.textContent = "One screen. One day. One note.";
    if (extrasWrap) extrasWrap.hidden = true;
    state.cycle = null;
    return false;
  }

  state.daysLived = meta.daysLived;
  state.hoursLived = meta.hoursLived;
  state.dayInCycle = meta.dayInCycle;
  state.cycleIndex = meta.cycleIndex;
  state.cycleStartYMD = meta.cycleStartYMD;
  state.cycle = getCycle(store, state.dobStr, state.mode, state.cycleIndex);

  const t = getDayType(state.dayInCycle);
  const phase = getPhase(state.dayInCycle);

  if (headerTitle) headerTitle.textContent = `Day ${state.dayInCycle} / 36`;
  if (headerPhase) headerPhase.textContent = `${phase.name} • ${phase.desc}`;
  if (bigDay) bigDay.innerHTML = `Day ${state.dayInCycle} <small>/ 36</small>`;
  setCardType(t);

  if (detailsClose) detailsClose.hidden = state.dayInCycle !== 36;

  const nextA = nextSpecialDay(state.dayInCycle, ANCHORS);
  const nextE = nextSpecialDay(state.dayInCycle, ECHOES);
  const nextSpecial =
    (nextA && nextE)
      ? (nextA.inDays <= nextE.inDays ? { kind: "anchor", ...nextA } : { kind: "echo", ...nextE })
      : (nextA ? { kind: "anchor", ...nextA } : (nextE ? { kind: "echo", ...nextE } : null));

  const specialChip = nextSpecial
    ? `<span class="chip"><span class="dot ${nextSpecial.kind}"></span> Next ${nextSpecial.kind}: Day ${nextSpecial.day} (in ${nextSpecial.inDays}d)</span>`
    : "";

  if (chipRow) {
    chipRow.innerHTML = [
      `<span class="chip"><span class="dot ${t}"></span> ${t === "light" ? "Light" : (t === "anchor" ? "Anchor" : "Echo")} day</span>`,
      `<span class="chip">Days on Earth: ${state.daysLived.toLocaleString()}</span>`,
      `<span class="chip">Hours: ${state.hoursLived.toLocaleString()}</span>`,
      specialChip
    ].filter(Boolean).join("");
  }

  const starts = computeNextPatternStarts(state.dobStr, state.mode);
  const startWindowToday = START_WINDOWS.has(state.dayInCycle);

  let patternMsg = "";
  if (startWindowToday) {
    patternMsg = `Next pattern start: Today (Day ${state.dayInCycle}).`;
  } else if (starts) {
    const soonest = (starts.day1.inDays <= starts.day18.inDays)
      ? { day: 1, ...starts.day1 }
      : { day: 18, ...starts.day18 };
    patternMsg = `Next pattern start: Day ${soonest.day} — ${formatYMD(soonest.date, state.mode)} (in ${soonest.inDays}d).`;
  }

  if (patternLine) {
    patternLine.textContent = patternMsg;
    patternLine.classList.toggle("hasText", !!patternMsg);
  }

  const showGuidance = state.density !== "silent";
  const showHint = state.density !== "silent";
  const showInsight = state.density === "supportive";

  if (guidanceLine) {
    guidanceLine.style.display = showGuidance ? "block" : "none";
    if (showGuidance) guidanceLine.textContent = GUIDANCE[state.dayInCycle] || "Stay with the rhythm.";
  }

  if (hintLine) {
    hintLine.style.display = showHint ? "block" : "none";
    if (showHint) {
      hintLine.textContent =
        t === "anchor"
          ? "Pressure day: keep it clean and exact."
          : t === "echo"
            ? "Mirror day: repeat and observe what returns."
            : "Light day: do the small repetition and breathe.";
    }
  }

  if (insightBox && insightLine) {
    if (showInsight) {
      insightBox.hidden = false;
      const idx = (state.dayInCycle + state.daysLived) % INSIGHTS.length;
      insightLine.textContent = INSIGHTS[idx];
    } else {
      insightBox.hidden = true;
    }
  }

  if (notePrompt) notePrompt.textContent = mindfulPrompt(state.dayInCycle);

  if (noteBox) {
    const existing = state.cycle.notes[String(state.dayInCycle)] || "";
    if (document.activeElement !== noteBox && noteBox.value !== existing) noteBox.value = existing;
    noteBox.placeholder = mindfulTemplate(state.dayInCycle).split("\n").slice(0, 3).join("\n");
  }

  if (intentionBox) {
    const existing = state.cycle.intention[String(state.dayInCycle)] || "";
    if (document.activeElement !== intentionBox && intentionBox.value !== existing) intentionBox.value = existing;
  }
  if (reflectionBox) {
    const existing = state.cycle.reflection[String(state.dayInCycle)] || "";
    if (document.activeElement !== reflectionBox && reflectionBox.value !== existing) reflectionBox.value = existing;
  }

  if (cycleLessonBox && state.cycle.close) cycleLessonBox.value = state.cycle.close.lesson || "";
  if (cycleCarryBox && state.cycle.close) cycleCarryBox.value = state.cycle.close.carry || "";
  if (cycleReleaseBox && state.cycle.close) cycleReleaseBox.value = state.cycle.close.release || "";

  const done = !!state.cycle.done[String(state.dayInCycle)];
  setDoneUI(state, done);
  state.autoMarked = done;

  const yearNow = $("yearNow");
  if (yearNow) yearNow.textContent = String(new Date().getFullYear());

  return true;
}
