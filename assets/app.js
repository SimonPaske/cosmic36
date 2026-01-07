import { loadStore } from "./core/store.js";
import { loadSettings } from "./settings/settings.js";
import { applyLayout, applyExperience } from "./features/layout.js";
import { renderMain } from "./features/render.js";
import { renderProgressBar } from "./features/progress.js";
import { renderAside } from "./features/aside.js";
import { initReview } from "./features/review.js";
import { initSettingsUI } from "./features/settings-ui.js";
import { initNotes } from "./features/notes.js";
import { initNotifications } from "./features/notifications.js";
import { initPatternInfo } from "./features/pattern-info.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = loadStore();
  const settings = loadSettings();

  const state = {
    dobStr: settings.dobStr || "",
    mode: settings.mode || "utc",
    layout: settings.layout || "mobile",
    density: settings.density || "minimal",
    gentle: settings.gentle !== false,
    experience: settings.experience || "compact",
    remindersEnabled: !!settings.remindersEnabled,
    reminderKinds: settings.reminderKinds || "anchor_echo",
    reminderTime: settings.reminderTime || "09:00",
    dayInCycle: null,
    cycleIndex: null,
    cycleStartYMD: "",
    daysLived: 0,
    hoursLived: 0,
    cycle: null,
    saveTimer: null,
    extraSaveTimer: null,
    selectedReviewItem: null,
    reviewSaveTimer: null,
    autoMarked: false
  };

  let reviewApi = null;
  let notificationsApi = null;

  function handleSelectDay(day) {
    state.selectedReviewItem = { kind: "day", cycleIndex: state.cycleIndex, day };
    if (reviewApi) {
      reviewApi.renderReview();
      reviewApi.openReviewDialog();
    }
  }

  function renderProgress() {
    renderProgressBar(state, { onSelectDay: handleSelectDay });
  }

  function renderAll() {
    applyLayout(state);
    applyExperience(state);
    renderMain(state, store);
    renderProgress();
    renderAside(state);
    if (notificationsApi) {
      notificationsApi.updateNextReminderUI();
      notificationsApi.scheduleNextReminder();
    }
  }

  const settingsApi = initSettingsUI(state, store, { render: renderAll });
  reviewApi = initReview(state, store, { render: renderAll, openSettingsDialog: settingsApi.openSettingsDialog });
  notificationsApi = initNotifications(state);
  initNotes(state, store, { renderProgressBar: renderProgress, renderAside });
  initPatternInfo();

  renderAll();
});
