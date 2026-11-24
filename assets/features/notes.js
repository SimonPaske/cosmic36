import { putCycle } from "../core/cycle.js";
import { mindfulTemplate } from "../core/content.js";
import { $ } from "../ui/dom.js";
import { showToast } from "../ui/toast.js";
import { openDialog, closeDialog } from "../ui/dialog.js";
import { showConfirm } from "../ui/confirm.js";
import { setDoneUI } from "./render.js";

export function initNotes(state, store, { renderProgressBar, renderAside }) {
  const statusBtn = $("statusBtn");
  const noteBox = $("noteBox");
  const expandBtn = $("expandBtn");
  const insertTemplateBtn = $("insertTemplateBtn");
  const clearNoteBtn = $("clearNoteBtn");
  const clearNoteDialog = $("clearNoteDialog");
  const clearNoteConfirm = $("clearNoteConfirm");
  const clearNoteCancel = $("clearNoteCancel");
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

  function getWritingStatus() {
    const note = (noteBox?.value || "").trim();
    const intention = (intentionBox?.value || "").trim();
    const reflection = (reflectionBox?.value || "").trim();
    const closeLesson = (cycleLessonBox?.value || "").trim();
    const closeCarry = (cycleCarryBox?.value || "").trim();
    const closeRelease = (cycleReleaseBox?.value || "").trim();
    const closeAny = !!(closeLesson || closeCarry || closeRelease);
    return { hasAny: !!(note || intention || reflection || closeAny) };
  }

  function syncAutoDoneStatus() {
    if (!state.cycle) return;
    const key = String(state.dayInCycle);
    const { hasAny } = getWritingStatus();
    const isDone = !!state.cycle.done?.[key];
    if (hasAny && !isDone) {
      state.cycle.done[key] = true;
      persistCycle();
      setDoneUI(state, true);
      if (renderProgressBar) renderProgressBar();
      if (renderAside) renderAside(state);
      state.autoMarked = true;
    } else if (!hasAny && isDone) {
      delete state.cycle.done[key];
      persistCycle();
      setDoneUI(state, false);
      if (renderProgressBar) renderProgressBar();
      if (renderAside) renderAside(state);
      state.autoMarked = false;
    }
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

    syncAutoDoneStatus();

    if (state.saveTimer) clearTimeout(state.saveTimer);
    setSaveIndicator("saving");

    state.saveTimer = setTimeout(commitNote, 650);
  }

  function commitNote() {
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = null;
    if (!state.cycle || !noteBox) return;
    state.cycle.notes[String(state.dayInCycle)] = noteBox.value || "";
    persistCycle();
    if (renderProgressBar) renderProgressBar();
    setSaveIndicator("saved");
  }

  const EXTRA_TEXT = { intention: intentionSaveText, reflection: reflectionSaveText, close: cycleSaveText };
  // One timer per field group, so typing in one box never cancels another's save.
  const extraTimers = {};

  function commitExtra(which) {
    if (extraTimers[which]) clearTimeout(extraTimers[which]);
    delete extraTimers[which];
    if (!state.cycle) return;
    const day = String(state.dayInCycle);
    if (which === "intention" && intentionBox) {
      if (!state.cycle.intention) state.cycle.intention = {};
      state.cycle.intention[day] = intentionBox.value || "";
    }
    if (which === "reflection" && reflectionBox) {
      if (!state.cycle.reflection) state.cycle.reflection = {};
      state.cycle.reflection[day] = reflectionBox.value || "";
    }
    if (which === "close") {
      if (!state.cycle.close) state.cycle.close = { lesson: "", carry: "", release: "" };
      if (cycleLessonBox) state.cycle.close.lesson = cycleLessonBox.value || "";
      if (cycleCarryBox) state.cycle.close.carry = cycleCarryBox.value || "";
      if (cycleReleaseBox) state.cycle.close.release = cycleReleaseBox.value || "";
    }
    persistCycle();
    setMiniSaved(EXTRA_TEXT[which], "saved");
  }

  function scheduleExtraAutosave(which) {
    if (!state.cycle || !(which in EXTRA_TEXT)) return;
    if (extraTimers[which]) clearTimeout(extraTimers[which]);
    syncAutoDoneStatus();
    setMiniSaved(EXTRA_TEXT[which], "saving");
    extraTimers[which] = setTimeout(() => commitExtra(which), 650);
  }

  // Save anything still waiting on its debounce timer. Called when the page is
  // hidden or unloaded, so closing the tab right after typing loses nothing.
  function flushPendingSaves() {
    if (state.saveTimer) commitNote();
    Object.keys(extraTimers).forEach(commitExtra);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingSaves();
  });
  window.addEventListener("pagehide", flushPendingSaves);

  if (statusBtn) {
    statusBtn.addEventListener("click", () => {
      if (!state.cycle) return;
      const key = String(state.dayInCycle);
      const isDone = !!state.cycle.done[key];
      if (isDone) unmarkDone();
      else markDone();
      state.autoMarked = !isDone;
    if (renderProgressBar) renderProgressBar();
    if (renderAside) renderAside(state);
    });
  }

  if (noteBox) {
    noteBox.addEventListener("input", scheduleNoteAutosave);
    noteBox.addEventListener("blur", commitNote);
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
    insertTemplateBtn.addEventListener("click", async () => {
      if (noteBox.value.trim()) {
        const ok = await showConfirm({
          title: "Replace note",
          message: "Replace your current note with a mindful template?",
          confirmText: "Replace",
          cancelText: "Cancel"
        });
        if (!ok) return;
      }
      noteBox.value = mindfulTemplate(state.dayInCycle);
      scheduleNoteAutosave();
      noteBox.focus();
    });
  }

  if (clearNoteBtn && noteBox) {
    const doClearNote = () => {
      noteBox.value = "";
      scheduleNoteAutosave();
      showToast("Cleared", "success");
    };

    clearNoteBtn.addEventListener("click", () => {
      if (clearNoteDialog && clearNoteConfirm && clearNoteCancel) {
        openDialog(clearNoteDialog, clearNoteBtn);
        return;
      }
      showToast("Unable to open confirmation dialog.", "warn");
    });

    if (clearNoteConfirm) {
      clearNoteConfirm.addEventListener("click", () => {
        doClearNote();
        if (clearNoteDialog) closeDialog(clearNoteDialog, clearNoteBtn);
      });
    }

    if (clearNoteCancel) {
      clearNoteCancel.addEventListener("click", () => {
        if (clearNoteDialog) closeDialog(clearNoteDialog, clearNoteBtn);
      });
    }

    if (clearNoteDialog) {
      clearNoteDialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeDialog(clearNoteDialog, clearNoteBtn);
      });
    }
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
        if (renderAside) renderAside(state);
      },
      { passive: true }
    );
  }
}
