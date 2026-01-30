import { CYCLE_DAYS } from "../core/constants.js";
import { getDayType } from "../core/cycle.js";
import { dayNumber, parseDob } from "../core/time.js";
import { $ } from "../ui/dom.js";
import { showToast } from "../ui/toast.js";
import { saveSettings } from "../settings/settings.js";

let reminderTimer = null;

export function initNotifications(state) {
  const notifToggle = $("notifToggle");
  const testNotifBtn = $("testNotifBtn");
  const notifStatus = $("notifStatus");
  const notifStatusPill = $("notifStatusPill");
  const notifAppStatus = $("notifAppStatus");
  const notifPermStatus = $("notifPermStatus");
  const notifHelp = $("notifHelp");
  const nextReminderText = $("nextReminderText");
  const reminderMeta = $("reminderMeta");

  function persistNotifSetting(nextEnabled) {
    state.notificationsEnabled = !!nextEnabled;
    saveSettings(state);
  }

  function setNotifToastFromState() {
    if (!("Notification" in window)) {
      showToast("Notifications not supported", "warn");
      return;
    }
    const permission = Notification.permission;
    if (permission === "granted") {
      showToast(state.notificationsEnabled ? "Notifications enabled ✓" : "Notifications off", state.notificationsEnabled ? "success" : "warn");
    } else if (permission === "denied") showToast("Notifications blocked", "warn");
    else showToast("Notifications: permission needed", "warn");
  }

  function updateNotifUI() {
    if (!notifStatus || !notifStatusPill || !notifToggle) return;
    if (!("Notification" in window)) {
      notifStatus.textContent = "Notifications not supported on this device.";
      notifStatusPill.classList.remove("ok", "warn");
      notifStatusPill.classList.add("warn");
      if (notifToggle) {
        notifToggle.disabled = true;
        notifToggle.checked = false;
      }
      if (notifAppStatus) notifAppStatus.textContent = "App setting: Off";
      if (notifPermStatus) notifPermStatus.textContent = "Browser permission: Not supported";
      if (notifHelp) notifHelp.hidden = true;
      if (testNotifBtn) testNotifBtn.disabled = true;
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied" && state.notificationsEnabled) {
      persistNotifSetting(false);
    }
    const appEnabled = !!state.notificationsEnabled;
    if (notifAppStatus) notifAppStatus.textContent = `App setting: ${appEnabled ? "On" : "Off"}`;
    if (notifPermStatus) {
      const permLabel = permission === "default" ? "Not asked" : permission[0].toUpperCase() + permission.slice(1);
      notifPermStatus.textContent = `Browser permission: ${permLabel}`;
    }

    if (permission === "granted") {
      notifToggle.disabled = false;
      notifToggle.checked = appEnabled;
      if (appEnabled) {
        notifStatus.textContent = "Notifications enabled ✓";
        notifStatusPill.classList.remove("warn");
        notifStatusPill.classList.add("ok");
        if (testNotifBtn) testNotifBtn.disabled = false;
      } else {
        notifStatus.textContent = "Notifications off in app.";
        notifStatusPill.classList.remove("ok");
        notifStatusPill.classList.remove("warn");
        if (testNotifBtn) testNotifBtn.disabled = true;
      }
      if (notifHelp) notifHelp.hidden = true;
    } else if (permission === "denied") {
      notifStatus.textContent = "Notifications blocked in browser settings.";
      notifStatusPill.classList.remove("ok");
      notifStatusPill.classList.add("warn");
      notifToggle.disabled = true;
      notifToggle.checked = false;
      if (notifHelp) {
        notifHelp.hidden = false;
        notifHelp.textContent = "Allow notifications in browser settings to enable.";
      }
      if (testNotifBtn) testNotifBtn.disabled = true;
    } else {
      notifToggle.disabled = false;
      notifToggle.checked = appEnabled;
      notifStatus.textContent = appEnabled
        ? "Notifications need permission."
        : "Notifications off in app.";
      notifStatusPill.classList.remove("ok", "warn");
      if (notifHelp) notifHelp.hidden = true;
      if (testNotifBtn) testNotifBtn.disabled = true;
    }
  }

  function isReminderDay(dayInCycle) {
    const type = getDayType(dayInCycle);
    if (state.reminderKinds === "anchor_echo") return type === "anchor" || type === "echo";
    if (state.reminderKinds === "anchor") return type === "anchor";
    if (state.reminderKinds === "echo") return type === "echo";
    return false;
  }

  function parseHHMM(hhmm) {
    const [hh, mm] = String(hhmm || "09:00").split(":").map(Number);
    return { hh: Number.isFinite(hh) ? hh : 9, mm: Number.isFinite(mm) ? mm : 0 };
  }

  function dateForCycleDay(dayInCycle) {
    const dob = parseDob(state.dobStr);
    if (!dob || state.dayInCycle == null) return null;

    const now = new Date();
    const dobDay = dayNumber(dob, state.mode);
    const todayDay = dayNumber(now, state.mode);
    const daysLived = todayDay - dobDay;
    const cycleStartOffset = daysLived - (daysLived % CYCLE_DAYS);
    const offsetDays = cycleStartOffset + (dayInCycle - 1);

    if (state.mode === "utc") {
      const ms = Date.UTC(dob.getFullYear(), dob.getMonth(), dob.getDate()) + offsetDays * 86400000;
      return new Date(ms);
    }

    const d = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
    d.setDate(d.getDate() + offsetDays);
    return d;
  }

  function formatWhen(date) {
    return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  }

  function computeNextReminder() {
    if (!state.remindersEnabled || !state.dobStr || state.dayInCycle == null) return null;

    const baseDate = dateForCycleDay(state.dayInCycle);
    if (!baseDate) return null;

    const { hh, mm } = parseHHMM(state.reminderTime);
    const now = new Date();

    for (let offset = 0; offset < 72; offset++) {
      const day = ((state.dayInCycle - 1 + offset) % CYCLE_DAYS) + 1;
      if (!isReminderDay(day)) continue;

      const d = new Date(baseDate.getTime() + offset * 86400000);
      d.setHours(hh, mm, 0, 0);

      if (d.getTime() > now.getTime()) {
        return { when: d, dayInCycle: day, type: getDayType(day) };
      }
    }
    return null;
  }

  async function tryShowNotification(title, body) {
    try {
      if (!("Notification" in window)) return false;
      if (!state.notificationsEnabled) return false;
      if (Notification.permission !== "granted") return false;
      new Notification(title, { body });
      return true;
    } catch {
      return false;
    }
  }

  function updateNextReminderUI() {
    const next = computeNextReminder();
    if (nextReminderText) {
      nextReminderText.textContent = next
        ? `Next reminder: ${next.type.toUpperCase()} • ${formatWhen(next.when)}`
        : (state.remindersEnabled ? "Next reminder: —" : "Reminders are off.");
    }
    if (reminderMeta) {
      if (next && state.remindersEnabled) {
        reminderMeta.hidden = false;
        reminderMeta.textContent = `Next: ${next.type} • ${formatWhen(next.when)}`;
      } else {
        reminderMeta.hidden = true;
        reminderMeta.textContent = "";
      }
    }
  }

  function clearReminderTimer() {
    if (reminderTimer) {
      clearTimeout(reminderTimer);
      reminderTimer = null;
    }
  }

  function scheduleNextReminder() {
    clearReminderTimer();
    const next = computeNextReminder();
    updateNextReminderUI();
    if (!next) return;

    const ms = next.when.getTime() - Date.now();
    if (ms <= 0) return;

    reminderTimer = setTimeout(async () => {
      const done = !!state.cycle?.done?.[String(state.dayInCycle)];
      const isTodayReminder = next.dayInCycle === state.dayInCycle;

      if (!done && isTodayReminder) {
        const title = next.type === "anchor" ? "Cosmic 36 — Anchor day" : "Cosmic 36 — Echo day";
        const body = "Take 1 minute to write your note.";
        const pushed = await tryShowNotification(title, body);
        if (!pushed) showToast(`${next.type === "anchor" ? "Anchor" : "Echo"} day reminder`);
      }
      scheduleNextReminder();
    }, ms);
  }

  if (notifToggle) {
    notifToggle.addEventListener("change", async () => {
      if (!("Notification" in window)) {
        showToast("Notifications not supported", "warn");
        notifToggle.checked = false;
        return;
      }

      const wantsOn = !!notifToggle.checked;
      const permission = Notification.permission;

      if (permission === "denied") {
        persistNotifSetting(false);
        notifToggle.checked = false;
        updateNotifUI();
        setNotifToastFromState();
        return;
      }

      if (permission === "default" && wantsOn) {
        const requested = await Notification.requestPermission();
        if (requested !== "granted") {
          persistNotifSetting(false);
          notifToggle.checked = false;
          updateNotifUI();
          showToast(requested === "denied" ? "Notifications blocked" : "Notifications not enabled", "warn");
          return;
        }
      }

      persistNotifSetting(wantsOn);
      updateNotifUI();
      showToast(wantsOn ? "Notifications enabled ✓" : "Notifications off", wantsOn ? "success" : "warn");
    });
  }

  document.addEventListener("visibilitychange", () => {
    updateNotifUI();
  });

  if (testNotifBtn) {
    testNotifBtn.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        showToast("Notifications not supported", "warn");
        return;
      }

      if (!state.notificationsEnabled) {
        showToast("Notifications are disabled", "warn");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        updateNotifUI();
        if (permission !== "granted") {
          showToast("Notifications not enabled", "warn");
          return;
        }
      }

      if (Notification.permission !== "granted") {
        showToast("Notifications are blocked", "warn");
        return;
      }

      const ok = await tryShowNotification(
        "Cosmic 36 — Test notification",
        "If you see this, notifications are working on this device/browser."
      );
      showToast(ok ? "Test notification sent" : "Couldn’t show notification (browser blocked)", ok ? "success" : "warn");
    });
  }

  updateNotifUI();

  return { updateNextReminderUI, scheduleNextReminder, updateNotifUI };
}
