import { computeCycleMeta, cycleKey, putCycle } from "../core/cycle.js";
import { saveSettings } from "../settings/settings.js";
import { $ } from "../ui/dom.js";
import { openDialog, closeDialog } from "../ui/dialog.js";
import { showToast } from "../ui/toast.js";
import { showConfirm, showNotice } from "../ui/confirm.js";
import { applyLayout, applyExperience } from "./layout.js";

export function initSettingsUI(state, store, { render }) {
  const settingsDialog = $("settingsDialog");
  const openSettings = $("openSettings");
  const closeSettings = $("closeSettings");
  const dobInput = $("dob");
  const modeRadios = [...document.querySelectorAll('input[name="mode"]')];
  const densitySelect = $("density");
  const gentleRadios = [...document.querySelectorAll('input[name="gentle"]')];
  const experienceRadios = [...document.querySelectorAll('input[name="experience"]')];
  const clearCycleBtn = $("clearCycleBtn");
  const layoutBtn = $("layoutBtn");
  const reminderEnabled = $("reminderEnabled");
  const reminderKinds = $("reminderKinds");
  const reminderTime = $("reminderTime");
  const asideSettingsBtn = $("asideSettingsBtn");

  function persistSettings() {
    saveSettings(state);
  }

  function syncSettingsUI() {
    if (dobInput) dobInput.value = state.dobStr || "";
    modeRadios.forEach((r) => (r.checked = r.value === state.mode));
    if (densitySelect) densitySelect.value = state.density;
    gentleRadios.forEach((r) => (r.checked = r.value === (state.gentle ? "on" : "off")));
    experienceRadios.forEach((r) => (r.checked = r.value === state.experience));
    if (reminderEnabled) reminderEnabled.checked = !!state.remindersEnabled;
    if (reminderKinds) reminderKinds.value = state.reminderKinds || "anchor_echo";
    if (reminderTime) reminderTime.value = state.reminderTime || "09:00";
  }

  function openSettingsDialog() {
    openDialog(settingsDialog, openSettings);
  }

  if (openSettings) openSettings.addEventListener("click", openSettingsDialog);
  if (asideSettingsBtn) asideSettingsBtn.addEventListener("click", openSettingsDialog);
  if (closeSettings) closeSettings.addEventListener("click", () => closeDialog(settingsDialog, openSettings));

  if (settingsDialog) {
    settingsDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDialog(settingsDialog, openSettings);
    });
  }

  if (layoutBtn) {
    layoutBtn.addEventListener("click", () => {
      state.layout = state.layout === "desktop" ? "mobile" : "desktop";
      persistSettings();
      applyLayout(state);
      if (render) render();
      showToast(state.layout === "desktop" ? "Desktop view" : "Mobile view");
    });
  }

  if (dobInput) {
    dobInput.addEventListener("change", () => {
      state.dobStr = dobInput.value || "";
      persistSettings();
      if (render) render();
    });
  }

  modeRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (!r.checked) return;
      state.mode = r.value;
      persistSettings();
      if (render) render();
    })
  );

  if (densitySelect) {
    densitySelect.addEventListener("change", () => {
      state.density = densitySelect.value;
      persistSettings();
      if (render) render();
    });
  }

  gentleRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (!r.checked) return;
      state.gentle = r.value === "on";
      persistSettings();
      if (render) render();
    })
  );

  experienceRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (!r.checked) return;
      state.experience = r.value;
      persistSettings();
      applyExperience(state);
      if (render) render();
      showToast(state.experience === "complete" ? "Complete mode" : "Compact mode");
    })
  );

  if (reminderEnabled) {
    reminderEnabled.checked = !!state.remindersEnabled;
    reminderEnabled.addEventListener("change", () => {
      state.remindersEnabled = reminderEnabled.checked;
      persistSettings();
      if (render) render();
      if (state.remindersEnabled) {
        showToast(`Reminders on • ${state.reminderTime} • ${state.reminderKinds.replace("_", " + ")}`);
      } else {
        showToast("Reminders off");
      }
    });
  }

  if (reminderKinds) {
    reminderKinds.value = state.reminderKinds || "anchor_echo";
    reminderKinds.addEventListener("change", () => {
      state.reminderKinds = reminderKinds.value;
      persistSettings();
      if (render) render();
      showToast(`Reminder days: ${state.reminderKinds.replace("_", " + ")}`);
    });
  }

  if (reminderTime) {
    reminderTime.value = state.reminderTime || "09:00";
    reminderTime.addEventListener("change", () => {
      state.reminderTime = reminderTime.value || "09:00";
      persistSettings();
      if (render) render();
      showToast(`Reminder time: ${state.reminderTime}`);
    });
  }

  if (clearCycleBtn) {
    clearCycleBtn.addEventListener("click", async () => {
      const info = computeCycleMeta(state.dobStr, state.mode);
      if (!info) {
        await showNotice({ title: "Missing date of birth", message: "Set your DOB first." });
        return;
      }
      const key = cycleKey(state.dobStr, state.mode, info.cycleIndex);
      const ok = await showConfirm({
        title: "Clear cycle data",
        message: "Clear notes + marks for the current cycle on this device?",
        confirmText: "Clear",
        cancelText: "Cancel",
        tone: "danger"
      });
      if (!ok) return;
      delete store[key];
      state.cycle = {
        updatedAt: Date.now(),
        done: {},
        notes: {},
        intention: {},
        reflection: {},
        close: { lesson: "", carry: "", release: "" }
      };
      putCycle(store, state.dobStr, state.mode, info.cycleIndex, state.cycle);
      state.dobStr = "";
      persistSettings();
      if (dobInput) dobInput.value = "";
      syncSettingsUI();
      if (render) render();
      showToast("Cleared", "success");
    });
  }

  syncSettingsUI();
  applyLayout(state);
  applyExperience(state);

  if (!state.dobStr) openDialog(settingsDialog, openSettings);

  return { openSettingsDialog, syncSettingsUI };
}
