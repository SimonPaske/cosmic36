import { loadStore } from "./core/store.js";
import { loadSettings, saveSettings } from "./settings/settings.js";
import { applyLayout, applyExperience } from "./features/layout.js";
import { renderMain } from "./features/render.js";
import { renderProgressBar } from "./features/progress.js";
import { renderAside } from "./features/aside.js";
import { initReview } from "./features/review.js";
import { initSettingsUI } from "./features/settings-ui.js";
import { initNotes } from "./features/notes.js";
import { initNotifications } from "./features/notifications.js";
import { initPatternInfo } from "./features/pattern-info.js";
import { initBackup } from "./features/backup.js";
import { $ } from "./ui/dom.js";
import { showNotice } from "./ui/confirm.js";

document.addEventListener("DOMContentLoaded", () => {
  const skipStartupRefresh = sessionStorage.getItem("skipStartupRefresh");
  if (skipStartupRefresh) {
    sessionStorage.removeItem("skipStartupRefresh");
  } else if (!sessionStorage.getItem("appRefreshed")) {
    sessionStorage.setItem("appRefreshed", "1");
    window.location.reload();
    return;
  }
  sessionStorage.removeItem("appRefreshed");

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
    notificationsEnabled: settings.notificationsEnabled !== false,
    reminderKinds: settings.reminderKinds || "anchor_echo",
    reminderTime: settings.reminderTime || "09:00",
    progressView: settings.progressView || "overview",
    usageMs: Number.isFinite(settings.usageMs) ? settings.usageMs : 0,
    autoBackupEnabled: !!settings.autoBackupEnabled,
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
  let usageStart = null;

  function flushUsage() {
    if (usageStart == null) return;
    const delta = Date.now() - usageStart;
    if (delta > 0) {
      state.usageMs += delta;
      saveSettings(state);
    }
    usageStart = Date.now();
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") {
      usageStart = Date.now();
      return;
    }
    if (usageStart != null) {
      const delta = Date.now() - usageStart;
      if (delta > 0) {
        state.usageMs += delta;
        saveSettings(state);
      }
      usageStart = null;
    }
  }

  function handleSelectDay(day) {
    if (!state.cycle) return;
    if (day > state.dayInCycle) {
      showNotice({ title: "Future day", message: "This day is in the future." });
      return;
    }
    const dayKey = String(day);
    const note = (state.cycle.notes?.[dayKey] || "").trim();
    const intention = (state.cycle.intention?.[dayKey] || "").trim();
    const reflection = (state.cycle.reflection?.[dayKey] || "").trim();
    if (!note && !intention && !reflection) {
      showNotice({ title: "No notes found", message: "No notes were left for that day." });
      return;
    }
    if (reviewApi?.openDayReview) reviewApi.openDayReview(day);
  }

  function renderProgress() {
    renderProgressBar(state, store, { onSelectDay: handleSelectDay });
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
  initBackup(state);
  handleVisibility();
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("beforeunload", () => {
    if (document.visibilityState === "visible") flushUsage();
  });

  renderAll();
});
