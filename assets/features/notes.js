import { putCycle } from "../core/cycle.js";
import { mindfulTemplate } from "../core/content.js";
import { $ } from "../ui/dom.js";
import { showToast } from "../ui/toast.js";
import { setDoneUI } from "./render.js";

export function initNotes(state, store, { renderProgressBar, renderAside }) {
  const statusBtn = $("statusBtn");
  const noteBox = $("noteBox");
  const expandBtn = $("expandBtn");
  const insertTemplateBtn = $("insertTemplateBtn");
  const clearNoteBtn = $("clearNoteBtn");
  const saveStatus = $("saveStatus");
  const saveText = $("saveText");
  const intentionBox = $("intentionBox");
  const reflectionBox = $("reflectionBox");
  const cycleLessonBox = $("cycleLessonBox");
  const cycleCarryBox = $("cycleCarryBox");
  const cycleReleaseBox = $("cycleReleaseBox");
  const intentionSaveText = $("intentionSaveText");
  const reflectionSaveText = $("reflectionSaveText");
  const cycleSaveText = $("cycleSaveText");
  const todayCard = $("todayCard");

  function persistCycle() {
    if (!state.cycle || !state.dobStr) return;
    putCycle(store, state.dobStr, state.mode, state.cycleIndex, state.cycle);
  }

  function setSaveIndicator(kind) {
    if (!saveStatus || !saveText) return;
    if (kind === "saving") {
      saveStatus.classList.remove("ok");
      saveText.textContent = "Saving…";
    } else if (kind === "saved") {
      saveStatus.classList.add("ok");
      saveText.textContent = "Saved ✓";
      setTimeout(() => {
        saveStatus.classList.remove("ok");
        saveText.textContent = "Autosave enabled";
      }, 1100);
    } else {
      saveStatus.classList.remove("ok");
      saveText.textContent = "Autosave enabled";
    }
  }

  function setMiniSaved(el, kind) {
    if (!el) return;
    if (kind === "saving") el.textContent = "Saving…";
    else if (kind === "saved") {
      el.textContent = "Saved ✓";
      setTimeout(() => (el.textContent = "Autosave enabled"), 900);
    } else el.textContent = "Autosave enabled";
  }

  function markDone() {
    state.cycle.done[String(state.dayInCycle)] = true;
    persistCycle();
    setDoneUI(state, true);
    showToast(state.gentle ? "Marked ✓" : "Done ✓");
  }

  function unmarkDone() {
    delete state.cycle.done[String(state.dayInCycle)];
    persistCycle();
    setDoneUI(state, false);
    showToast(state.gentle ? "Unmarked" : "Undone");
  }

  function scheduleNoteAutosave() {
    if (!state.cycle || !noteBox) return;

    const trimmed = (noteBox.value || "").trim();
    if (!state.autoMarked && trimmed.length > 3) {
      state.cycle.done[String(state.dayInCycle)] = true;
      persistCycle();
      setDoneUI(state, true);
      if (renderProgressBar) renderProgressBar();
      state.autoMarked = true;
    }

    if (state.saveTimer) clearTimeout(state.saveTimer);
    setSaveIndicator("saving");

    state.saveTimer = setTimeout(() => {
      state.cycle.notes[String(state.dayInCycle)] = noteBox.value || "";
      persistCycle();
      if (renderProgressBar) renderProgressBar();
      setSaveIndicator("saved");
    }, 650);
  }

  function scheduleExtraAutosave(which) {
    if (!state.cycle) return;
    if (state.extraSaveTimer) clearTimeout(state.extraSaveTimer);

    const map = {
      intention: { box: intentionBox, text: intentionSaveText, store: state.cycle.intention },
      reflection: { box: reflectionBox, text: reflectionSaveText, store: state.cycle.reflection },
      close: { box: null, text: cycleSaveText, store: state.cycle.close }
    };
    const cfg = map[which];
    if (!cfg) return;

    if (which === "intention" || which === "reflection") {
      const trimmed = (cfg.box?.value || "").trim();
      if (!state.autoMarked && trimmed.length > 3) {
        state.cycle.done[String(state.dayInCycle)] = true;
        persistCycle();
        setDoneUI(state, true);
        if (renderProgressBar) renderProgressBar();
        state.autoMarked = true;
      }
    }

    setMiniSaved(cfg.text, "saving");

    state.extraSaveTimer = setTimeout(() => {
      if (which === "intention" && cfg.box) cfg.store[String(state.dayInCycle)] = cfg.box.value || "";
      if (which === "reflection" && cfg.box) cfg.store[String(state.dayInCycle)] = cfg.box.value || "";
      if (which === "close") {
        if (cycleLessonBox) state.cycle.close.lesson = cycleLessonBox.value || "";
        if (cycleCarryBox) state.cycle.close.carry = cycleCarryBox.value || "";
        if (cycleReleaseBox) state.cycle.close.release = cycleReleaseBox.value || "";
      }
      persistCycle();
      setMiniSaved(cfg.text, "saved");
    }, 650);
  }

  if (statusBtn) {
    statusBtn.addEventListener("click", () => {
      if (!state.cycle) return;
      const key = String(state.dayInCycle);
      const isDone = !!state.cycle.done[key];
      if (isDone) unmarkDone();
      else markDone();
      state.autoMarked = !isDone;
      if (renderProgressBar) renderProgressBar();
      if (renderAside) renderAside();
    });
  }

  if (noteBox) {
    noteBox.addEventListener("input", scheduleNoteAutosave);
    noteBox.addEventListener("blur", () => {
      if (!state.cycle) return;
      state.cycle.notes[String(state.dayInCycle)] = noteBox.value || "";
      persistCycle();
      if (renderProgressBar) renderProgressBar();
      setSaveIndicator("saved");
    });
  }

  if (expandBtn && noteBox) {
    const setExpandLabel = (isExpanded) => {
      expandBtn.textContent = isExpanded ? "Collapse" : "Expand";
      expandBtn.setAttribute("aria-label", isExpanded ? "Collapse note" : "Expand note");
    };

    setExpandLabel(expandBtn.getAttribute("aria-expanded") === "true");

    expandBtn.addEventListener("click", () => {
      const isExpanded = expandBtn.getAttribute("aria-expanded") === "true";
      const next = !isExpanded;
      expandBtn.setAttribute("aria-expanded", String(next));
      noteBox.rows = next ? 14 : 6;
      setExpandLabel(next);
      showToast(next ? "Expanded" : "Collapsed");
    });
  }

  if (insertTemplateBtn && noteBox) {
    insertTemplateBtn.addEventListener("click", () => {
      if (noteBox.value.trim()) {
        if (!confirm("Replace your current note with a mindful template?")) return;
      }
      noteBox.value = mindfulTemplate(state.dayInCycle);
      scheduleNoteAutosave();
      noteBox.focus();
    });
  }

  if (clearNoteBtn && noteBox) {
    clearNoteBtn.addEventListener("click", () => {
      if (!confirm("Clear the note for today?")) return;
      noteBox.value = "";
      scheduleNoteAutosave();
      showToast("Cleared");
    });
  }

  if (intentionBox) intentionBox.addEventListener("input", () => scheduleExtraAutosave("intention"));
  if (reflectionBox) reflectionBox.addEventListener("input", () => scheduleExtraAutosave("reflection"));
  if (cycleLessonBox) cycleLessonBox.addEventListener("input", () => scheduleExtraAutosave("close"));
  if (cycleCarryBox) cycleCarryBox.addEventListener("input", () => scheduleExtraAutosave("close"));
  if (cycleReleaseBox) cycleReleaseBox.addEventListener("input", () => scheduleExtraAutosave("close"));

  // Swipe gestures (mobile)
  let touch = { startX: 0, startY: 0 };
  const SWIPE_X = 55;
  const SWIPE_Y = 80;

  if (todayCard) {
    todayCard.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        touch.startX = t.clientX;
        touch.startY = t.clientY;
      },
      { passive: true }
    );

    todayCard.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        const dx = t.clientX - touch.startX;
        const dy = t.clientY - touch.startY;
        if (Math.abs(dx) > 12 && Math.abs(dy) < 20) e.preventDefault();
      },
      { passive: false }
    );

    todayCard.addEventListener(
      "touchend",
      (e) => {
        if (state.layout === "desktop") return;
        if (!state.cycle) return;

        const t = e.changedTouches[0];
        const dx = t.clientX - touch.startX;
        const dy = t.clientY - touch.startY;
        if (Math.abs(dy) > SWIPE_Y) return;

        if (dx > SWIPE_X) markDone();
        else if (dx < -SWIPE_X) unmarkDone();

        if (renderProgressBar) renderProgressBar();
        if (renderAside) renderAside();
      },
      { passive: true }
    );
  }
}
