import { $ } from "../ui/dom.js";
import { openDialog } from "../ui/dialog.js";
import { openTooltip } from "../ui/tooltip.js";
import { putCycle } from "../core/cycle.js";
import { showToast } from "../ui/toast.js";
import { PATTERN_INFO } from "../../infoContent.js";

function ensureCycle(state) {
  if (state.cycle) return true;
  const dialog = $("settingsDialog");
  const openBtn = $("openSettings");
  if (dialog && openBtn) openDialog(dialog, openBtn);
  return false;
}

function updateStatus(state) {
  const statusBtn = $("statusBtn");
  const statusText = $("statusText");
  const stateDot = $("stateDot");
  if (!statusBtn || !statusText || !stateDot) return;

  const isDone = !!state.cycle?.done?.[String(state.dayInCycle)];
  statusBtn.setAttribute("aria-pressed", isDone ? "true" : "false");
  stateDot.classList.toggle("done", isDone);
  statusText.textContent = isDone
    ? state.gentle
      ? "Marked"
      : "Done"
    : state.gentle
      ? "Not marked"
      : "Not done";
}

function updateProgressToday(state) {
  const progressBar = $("progressBar");
  const todayBtn = progressBar?.querySelector(".dayBtn.today");
  if (!todayBtn) return;
  const isDone = !!state.cycle?.done?.[String(state.dayInCycle)];
  todayBtn.classList.toggle("done", isDone);
  const label = `Day ${state.dayInCycle}, today${isDone ? ", marked" : ""}`;
  todayBtn.setAttribute("aria-label", label);
}

function hydrateInputs(state) {
  if (!state.cycle) return;
  const dayKey = String(state.dayInCycle);

  const noteBox = $("noteBox");
  if (noteBox) noteBox.value = state.cycle.notes?.[dayKey] || "";

  const intentionBox = $("intentionBox");
  if (intentionBox) intentionBox.value = state.cycle.intention?.[dayKey] || "";

  const reflectionBox = $("reflectionBox");
  if (reflectionBox) reflectionBox.value = state.cycle.reflection?.[dayKey] || "";

  const cycleLessonBox = $("cycleLessonBox");
  if (cycleLessonBox) cycleLessonBox.value = state.cycle.close?.lesson || "";

  const cycleCarryBox = $("cycleCarryBox");
  if (cycleCarryBox) cycleCarryBox.value = state.cycle.close?.carry || "";

  const cycleReleaseBox = $("cycleReleaseBox");
  if (cycleReleaseBox) cycleReleaseBox.value = state.cycle.close?.release || "";
}

function saveCycle(state, store) {
  putCycle(store, state.dobStr, state.mode, state.cycleIndex, state.cycle);
}

export function initInteractions(state, store) {
  hydrateInputs(state);
  updateStatus(state);

  const patternInfoBtn = $("patternInfoBtn");
  if (patternInfoBtn) {
    patternInfoBtn.addEventListener("click", () => {
      openTooltip(patternInfoBtn, PATTERN_INFO);
    });
  }

  const statusBtn = $("statusBtn");
  if (statusBtn) {
    statusBtn.addEventListener("click", () => {
      if (!ensureCycle(state)) return;
      const dayKey = String(state.dayInCycle);
      state.cycle.done = state.cycle.done || {};
      const next = !state.cycle.done[dayKey];
      state.cycle.done[dayKey] = next;
      saveCycle(state, store);
      updateStatus(state);
      updateProgressToday(state);
      showToast(next ? "Marked" : "Unmarked");
    });
  }

  const expandBtn = $("expandBtn");
  const extrasWrap = $("extrasWrap");
  if (expandBtn && extrasWrap) {
    expandBtn.addEventListener("click", () => {
      extrasWrap.hidden = !extrasWrap.hidden;
      const expanded = !extrasWrap.hidden;
      expandBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
      expandBtn.textContent = expanded ? "Collapse" : "Expand";
    });
  }

  const noteBox = $("noteBox");
  const saveText = $("saveText");
  let noteTimer = null;
  if (noteBox) {
    noteBox.addEventListener("input", () => {
      if (!ensureCycle(state)) return;
      if (noteTimer) window.clearTimeout(noteTimer);
      noteTimer = window.setTimeout(() => {
        const dayKey = String(state.dayInCycle);
        state.cycle.notes = state.cycle.notes || {};
        state.cycle.notes[dayKey] = noteBox.value;
        saveCycle(state, store);
        if (saveText) saveText.textContent = "Saved";
        showToast("Saved");
      }, 200);
    });
  }

  const insertTemplateBtn = $("insertTemplateBtn");
  if (insertTemplateBtn && noteBox) {
    insertTemplateBtn.addEventListener("click", () => {
      const template = "What did I do?\nWhat did I notice?\nWhat will I carry forward?";
      if (!noteBox.value.trim()) noteBox.value = template;
      else noteBox.value = `${noteBox.value.trim()}\n\n${template}`;
      noteBox.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  const clearNoteBtn = $("clearNoteBtn");
  if (clearNoteBtn && noteBox) {
    clearNoteBtn.addEventListener("click", () => {
      if (!ensureCycle(state)) return;
      noteBox.value = "";
      noteBox.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  const intentionBox = $("intentionBox");
  const reflectionBox = $("reflectionBox");
  const cycleLessonBox = $("cycleLessonBox");
  const cycleCarryBox = $("cycleCarryBox");
  const cycleReleaseBox = $("cycleReleaseBox");

  if (intentionBox) {
    intentionBox.addEventListener("input", () => {
      if (!ensureCycle(state)) return;
      const dayKey = String(state.dayInCycle);
      state.cycle.intention = state.cycle.intention || {};
      state.cycle.intention[dayKey] = intentionBox.value;
      saveCycle(state, store);
      showToast("Saved");
    });
  }

  if (reflectionBox) {
    reflectionBox.addEventListener("input", () => {
      if (!ensureCycle(state)) return;
      const dayKey = String(state.dayInCycle);
      state.cycle.reflection = state.cycle.reflection || {};
      state.cycle.reflection[dayKey] = reflectionBox.value;
      saveCycle(state, store);
      showToast("Saved");
    });
  }

  if (cycleLessonBox) {
    cycleLessonBox.addEventListener("input", () => {
      if (!ensureCycle(state)) return;
      state.cycle.close = state.cycle.close || {};
      state.cycle.close.lesson = cycleLessonBox.value;
      saveCycle(state, store);
      showToast("Saved");
    });
  }

  if (cycleCarryBox) {
    cycleCarryBox.addEventListener("input", () => {
      if (!ensureCycle(state)) return;
      state.cycle.close = state.cycle.close || {};
      state.cycle.close.carry = cycleCarryBox.value;
      saveCycle(state, store);
      showToast("Saved");
    });
  }

  if (cycleReleaseBox) {
    cycleReleaseBox.addEventListener("input", () => {
      if (!ensureCycle(state)) return;
      state.cycle.close = state.cycle.close || {};
      state.cycle.close.release = cycleReleaseBox.value;
      saveCycle(state, store);
      showToast("Saved");
    });
  }

  const clearCycleBtn = $("clearCycleBtn");
  if (clearCycleBtn) {
    clearCycleBtn.addEventListener("click", () => {
      if (!ensureCycle(state)) return;
      const ok = window.confirm("Clear notes and marks for this cycle?");
      if (!ok) return;
      state.cycle.done = {};
      state.cycle.notes = {};
      state.cycle.intention = {};
      state.cycle.reflection = {};
      state.cycle.close = { lesson: "", carry: "", release: "" };
      saveCycle(state, store);
      hydrateInputs(state);
      updateStatus(state);
      updateProgressToday(state);
      showToast("Cleared");
    });
  }
}
