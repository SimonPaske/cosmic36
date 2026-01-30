import { SETTINGS_KEY } from "../core/constants.js";
import { loadJSON, saveJSON } from "../core/store.js";

export function loadSettings() {
  const fallback = {
    dobStr: "",
    mode: "utc",
    layout: "mobile",
    density: "minimal",
    gentle: true,
    experience: "compact",
    remindersEnabled: false,
    notificationsEnabled: true,
    reminderKinds: "anchor_echo",
    reminderTime: "09:00",
    autoBackupEnabled: false
  };

  const settings = loadJSON(SETTINGS_KEY, fallback);
  return { ...fallback, ...settings };
}

export function saveSettings(state) {
  const clean = {
    dobStr: state.dobStr,
    mode: state.mode,
    layout: state.layout,
    density: state.density,
    gentle: state.gentle,
    experience: state.experience,
    remindersEnabled: state.remindersEnabled,
    notificationsEnabled: state.notificationsEnabled,
    reminderKinds: state.reminderKinds,
    reminderTime: state.reminderTime,
    autoBackupEnabled: state.autoBackupEnabled
  };

  saveJSON(SETTINGS_KEY, clean);
}
