/* assets/app.js — FULL FILE (module)
   Includes:
   - Works with <script type="module" src="./assets/app.js"></script>
   - Pattern ⓘ tooltip (content imported from ./infoContent.js)
   - Experience: compact hides extrasWrap, complete shows it
   - Guidance density:
       silent    -> hides guidance + hint + insight
       minimal   -> shows guidance + hint, hides spiritual insight
       supportive-> shows guidance + hint + spiritual insight
   - Export moved to Review dialog (supports these optional buttons if present):
       #exportNotesTxtBtn  (existing)
       #exportCloseTxtBtn  (new optional)
       #exportBothTxtBtn   (new optional)
   - Safe if some elements are missing (no crashes)
*/

import { PATTERN_INFO } from "./infoContent.js";

document.addEventListener("DOMContentLoaded", () => {
  const CYCLE_DAYS = 36;
  const ANCHORS = new Set([3, 6, 9, 12, 15, 18]);
  const ECHOES = new Set([21, 24, 27, 30, 33, 36]);
  const START_WINDOWS = new Set([1, 18]);

  const GUIDANCE = {
    1: "Declare what you want, clearly and simply.",
    2: "Make your repetition effortless and automatic.",
    3: "Repeat the declaration and take one aligned action.",
    4: "Stay steady. No extra pressure needed.",
    5: "Notice resistance. Stay gentle. Continue.",
    6: "Repeat and add one clean layer of action.",
    7: "Hold the vision without demanding proof.",
    8: "Choose alignment over mood.",
    9: "Complete the triad with a third aligned action.",
    10: "Simplify. Repeat the basics.",
    11: "Let the body lead. Keep it calm.",
    12: "Repeat Day 3 exactly—no edits.",
    13: "Consistency is the spell.",
    14: "Stay honest. Stay simple.",
    15: "Repeat Day 6. Embody the layer.",
    16: "Steady beats intense.",
    17: "Return. Repeat. Release doubt.",
    18: "Repeat the full stack and feel the shift.",
    19: "Keep repeating—watch what responds.",
    20: "Stay open. Receive without chasing.",
    21: "Echo of Day 3: notice what returns.",
    22: "Observe patterns without judgment.",
    23: "Don’t rush outcomes. Repeat.",
    24: "Echo of Day 6: notice the response.",
    25: "Keep it small and real.",
    26: "Let the field speak. Write what you see.",
    27: "Echo of Day 9: what amplifies?",
    28: "Receive what’s here.",
    29: "Trust timing. Repeat.",
    30: "Echo of Day 12: stability or drift?",
    31: "Return to simplicity.",
    32: "Presence is power.",
    33: "Echo of Day 15: what’s undeniable now?",
    34: "Let it land. Rest.",
    35: "Give thanks and stay aligned.",
    36: "Repeat once more, then choose what you carry forward."
  };

  const INSIGHTS = [
    "Repetition is how attention becomes devotion — and devotion becomes a stable inner field.",
    "A ritual is a container for the nervous system: safety comes from predictability.",
    "Breath awareness is the oldest meditation technology — always available, always honest.",
    "Gratitude shifts perception first. Behavior follows perception.",
    "The body learns through consistency, not intensity.",
    "Noticing is already transformation. Awareness is action.",
    "In Zen: chop wood, carry water — awakening lives inside ordinary acts.",
    "Compassion is discipline: speak to yourself like someone you love.",
    "Surrender is not giving up — it’s releasing control of timing.",
    "Tension and ease are information. The body is a quiet oracle."
  ];

  const SETTINGS_KEY = "cosmic36_settings_v7";
  const STORE_KEY = "cosmic36_store_v7";

  const $ = (id) => document.getElementById(id);

  // ---------- Storage ----------
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------- Toast ----------
  function showToast(msg) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 900);
  }

  // ---------- Day number utilities ----------
  function toUtcDayNumber(d) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function toLocalDayNumber(d) {
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor(midnight.getTime() / 86400000);
  }
  function dayNumber(d, mode) {
    return mode === "local" ? toLocalDayNumber(d) : toUtcDayNumber(d);
  }

  function parseDob(value) {
    if (!value) return null;
    const [y, m, dd] = value.split("-").map(Number);
    if (!y || !m || !dd) return null;
    return new Date(y, m - 1, dd);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function formatYMD(date, mode) {
    if (mode === "utc") {
      return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
    }
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function addDaysToDayNumber(todayDayNumber, addDays) {
    return new Date((todayDayNumber + addDays) * 86400000);
  }

  function nextOccurrenceInCycle(currentDay, targetDay, cycleDays = 36) {
    return (targetDay - currentDay + cycleDays) % cycleDays; // 0..cycleDays-1
  }

  function computeNextPatternStarts(dobStr, mode) {
    const dob = parseDob(dobStr);
    if (!dob) return null;

    const now = new Date();
    const dobDay = dayNumber(dob, mode);
    const todayDay = dayNumber(now, mode);
    if (todayDay < dobDay) return null;

    const daysLived = todayDay - dobDay;
    const dayInCycle = (daysLived % CYCLE_DAYS) + 1;

    const inToDay1 = nextOccurrenceInCycle(dayInCycle, 1, CYCLE_DAYS);
    const inToDay18 = nextOccurrenceInCycle(dayInCycle, 18, CYCLE_DAYS);

    const day1Date = addDaysToDayNumber(todayDay, inToDay1);
    const day18Date = addDaysToDayNumber(todayDay, inToDay18);

    return {
      dayInCycle,
      day1: { inDays: inToDay1, date: day1Date },
      day18: { inDays: inToDay18, date: day18Date }
    };
  }

  // ---------- Logic ----------
  function getDayType(day) {
    if (ANCHORS.has(day)) return "anchor";
    if (ECHOES.has(day)) return "echo";
    return "light";
  }

  function getPhase(day) {
    return day <= 18
      ? { name: "Phase 1: Sending", desc: "Imprint through repetition. Pressure days carry the charge." }
      : { name: "Phase 2: Receiving", desc: "Repeat and observe what returns. Let life respond." };
  }

  function mindfulPrompt(day) {
    const t = getDayType(day);
    if (day === 1) return "Declaration — write it in one clear sentence.";
    if (day === 2) return "Make it easy — what will you repeat daily without force?";
    if (t === "anchor") return "Anchor day — what action did you take and how did it feel in your body?";
    if (t === "echo") return "Echo day — what returned, and what might it be teaching you?";
    return "Light day — what did you do, notice, and carry forward?";
  }

  function mindfulTemplate(day) {
    const t = getDayType(day);
    if (day === 1) {
      return "Declaration (one sentence):\n\nToday I repeat by:\n\nOne small aligned action:\n";
    }
    if (day === 2) {
      return "Effortless repetition:\n\nWhat makes this easy today:\n\nMinimum version I will do no matter what:\n";
    }
    if (t === "anchor") {
      return "Action taken today:\n\nBody signal (tension/ease/energy):\n\nOne thing I’ll keep repeating:\n";
    }
    if (t === "echo") {
      return "What returned today:\n\nWhat it might be showing me:\n\nMy response (one clean choice):\n";
    }
    return "What I did (one line):\n\nWhat I noticed (one line):\n\nWhat I carry forward (one line):\n";
  }

  function nextSpecialDay(fromDay, set) {
    for (let i = 0; i < CYCLE_DAYS; i++) {
      const d = ((fromDay - 1 + i) % CYCLE_DAYS) + 1;
      if (set.has(d)) return { day: d, inDays: i };
    }
    return null;
  }

  function cycleIndexFromDaysLived(daysLived) {
    return Math.floor(daysLived / CYCLE_DAYS) + 1;
  }

  function cycleKey(dobStr, mode, cycleIndex) {
    return `${dobStr}|${mode}|cycle${cycleIndex}`;
  }

  function getCycle(store, dobStr, mode, cycleIndex) {
    const k = cycleKey(dobStr, mode, cycleIndex);
    return (
      store[k] || {
        updatedAt: Date.now(),
        done: {},
        notes: {},
        intention: {},
        reflection: {},
        close: { lesson: "", carry: "", release: "" }
      }
    );
  }

  function putCycle(store, dobStr, mode, cycleIndex, cycle) {
    const k = cycleKey(dobStr, mode, cycleIndex);
    cycle.updatedAt = Date.now();
    store[k] = cycle;
    saveJSON(STORE_KEY, store);
  }

  // ---------- Tooltip (ⓘ) ----------
  let activeTooltip = null;

  function closeTooltip() {
    if (!activeTooltip) return;
    activeTooltip.remove();
    activeTooltip = null;
    document.removeEventListener("mousedown", handleOutsideClick, true);
    document.removeEventListener("keydown", handleEsc, true);
    window.removeEventListener("resize", closeTooltip, true);
    window.removeEventListener("scroll", closeTooltip, true);
  }

  function handleOutsideClick(e) {
    if (!activeTooltip) return;
    const anchor = activeTooltip._anchorEl;
    if (activeTooltip.contains(e.target)) return;
    if (anchor && anchor.contains(e.target)) return;
    closeTooltip();
  }

  function handleEsc(e) {
    if (e.key === "Escape") closeTooltip();
  }

  function openTooltip(anchorEl, { title, body }) {
    closeTooltip();

    const tip = document.createElement("div");
    tip.className = "tooltip";
    tip.setAttribute("role", "dialog");
    tip.setAttribute("aria-label", title);

    const paragraphs = body
      .trim()
      .split("\n\n")
      .map((p) => `<p>${String(p).trim()}</p>`)
      .join("");

    tip.innerHTML = `
      <div class="tooltipInner">
        <div class="tooltipTitle">${title}</div>
        <div class="tooltipBody">${paragraphs}</div>
      </div>
    `;

    tip._anchorEl = anchorEl;
    document.body.appendChild(tip);

    const rect = anchorEl.getBoundingClientRect();
    const margin = 10;

    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;

    const fitsBelow = rect.bottom + margin + tipH < window.innerHeight;
    const top = fitsBelow ? rect.bottom + margin : rect.top - margin - tipH;

    const left = Math.min(window.innerWidth - tipW - 12, Math.max(12, rect.left));

    tip.style.top = `${top + window.scrollY}px`;
    tip.style.left = `${left + window.scrollX}px`;

    activeTooltip = tip;

    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("keydown", handleEsc, true);
    window.addEventListener("resize", closeTooltip, true);
    window.addEventListener("scroll", closeTooltip, true);
  }

  // ---------- State ----------
  let store = loadJSON(STORE_KEY, {});
  let settings = loadJSON(SETTINGS_KEY, {
    dobStr: "",
    mode: "utc",
    layout: "mobile",
    density: "minimal", // minimal | supportive | silent
    gentle: true,
    experience: "compact" // compact | complete
  });

  const state = {
    dobStr: settings.dobStr || "",
    mode: settings.mode || "utc",
    layout: settings.layout || "mobile",
    density: settings.density || "minimal",
    gentle: settings.gentle !== false,
    experience: settings.experience || "compact",

    dayInCycle: null,
    cycleIndex: null,
    cycleStartYMD: "",
    daysLived: 0,
    hoursLived: 0,
    cycle: null,

    saveTimer: null,
    extraSaveTimer: null,

    selectedReviewItem: null,
    reviewSaveTimer: null
  };

  function persistSettings() {
    saveJSON(SETTINGS_KEY, {
      dobStr: state.dobStr,
      mode: state.mode,
      layout: state.layout,
      density: state.density,
      gentle: state.gentle,
      experience: state.experience
    });
  }

  // ---------- UI refs ----------
  const subLine = $("subLine");
  const headerTitle = $("headerTitle");
  const headerPhase = $("headerPhase");
  const chipRow = $("chipRow");
  const patternLine = $("patternLine");
  const patternInfoBtn = $("patternInfoBtn");

  const todayCard = $("todayCard");
  const bigDay = $("bigDay");
  const guidanceLine = $("guidanceLine");
  const hintLine = $("hintLine");

  const insightBox = $("insightBox");
  const insightLine = $("insightLine");

  const statusBtn = $("statusBtn");
  const stateDot = $("stateDot");
  const statusText = $("statusText");

  const notePrompt = $("notePrompt");
  const noteBox = $("noteBox");
  const expandBtn = $("expandBtn");
  const insertTemplateBtn = $("insertTemplateBtn");
  const clearNoteBtn = $("clearNoteBtn");
  const saveStatus = $("saveStatus");
  const saveText = $("saveText");

  const extrasWrap = $("extrasWrap");
  const intentionBox = $("intentionBox");
  const reflectionBox = $("reflectionBox");
  const cycleLessonBox = $("cycleLessonBox");
  const cycleCarryBox = $("cycleCarryBox");
  const cycleReleaseBox = $("cycleReleaseBox");

  const intentionSaveText = $("intentionSaveText");
  const reflectionSaveText = $("reflectionSaveText");
  const cycleSaveText = $("cycleSaveText");

  const layoutBtn = $("layoutBtn");
  const lifeAside = $("lifeAside");
  const asideText = $("asideText");
  const kv = $("kv");
  const swipeHint = $("swipeHint");

  const settingsDialog = $("settingsDialog");
  const openSettings = $("openSettings");
  const closeSettings = $("closeSettings");
  const dobInput = $("dob");
  const modeRadios = [...document.querySelectorAll('input[name="mode"]')];
  const densitySelect = $("density");
  const gentleRadios = [...document.querySelectorAll('input[name="gentle"]')];
  const experienceRadios = [...document.querySelectorAll('input[name="experience"]')];
  const clearCycleBtn = $("clearCycleBtn");

  const reviewDialog = $("reviewDialog");
  const openReview = $("openReview");
  const closeReview = $("closeReview");
  const reviewQuery = $("reviewQuery");
  const reviewScopeRadios = [...document.querySelectorAll('input[name="reviewScope"]')];
  const noteList = $("noteList");
  const reviewEditorWrap = $("reviewEditorWrap");
  const reviewEditor = $("reviewEditor");
  const reviewSaveText = $("reviewSaveText");
  const jumpToTodayBtn = $("jumpToTodayBtn");

  // Export buttons in review (some may not exist yet — safe)
  const exportNotesTxtBtn = $("exportNotesTxtBtn"); // daily notes
  const exportCloseTxtBtn = $("exportCloseTxtBtn"); // close cycle
  const exportBothTxtBtn = $("exportBothTxtBtn"); // both

  const asideReviewBtn = $("asideReviewBtn");
  const asideSettingsBtn = $("asideSettingsBtn");

  const yearNow = $("yearNow");
  if (yearNow) yearNow.textContent = String(new Date().getFullYear());

  // ---------- UI helpers ----------
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

  function setDoneUI(done) {
    if (!stateDot || !statusBtn || !statusText) return;
    stateDot.classList.toggle("done", done);
    statusBtn.setAttribute("aria-pressed", String(done));
    statusText.textContent = state.gentle ? (done ? "Marked ✓" : "Not marked") : (done ? "Done ✓" : "Not done");
  }

  function setCardType(type) {
    if (!todayCard) return;
    todayCard.classList.remove("light", "anchor", "echo");
    todayCard.classList.add(type);
  }

  function openDialog(dialogEl, openerBtn) {
    if (openerBtn) openerBtn.setAttribute("aria-expanded", "true");
    if (dialogEl && typeof dialogEl.showModal === "function") dialogEl.showModal();
    else if (dialogEl) dialogEl.setAttribute("open", "");
  }

  function closeDialog(dialogEl, openerBtn) {
    if (openerBtn) openerBtn.setAttribute("aria-expanded", "false");
    if (dialogEl && typeof dialogEl.close === "function") dialogEl.close();
    else if (dialogEl) dialogEl.removeAttribute("open");
    if (openerBtn) openerBtn.focus();
  }

  function applyLayout() {
    document.documentElement.dataset.layout = state.layout;
    if (layoutBtn) layoutBtn.textContent = state.layout === "desktop" ? "Mobile view" : "Desktop view";
    const isDesktop = state.layout === "desktop";
    if (lifeAside) lifeAside.hidden = !isDesktop;
    if (swipeHint) swipeHint.style.display = isDesktop ? "none" : "flex";
  }

  function applyExperience() {
    document.documentElement.dataset.experience = state.experience;
    if (!extrasWrap) return;
    extrasWrap.hidden = state.experience !== "complete";
  }

  function renderAside() {
    if (state.layout !== "desktop") return;
    if (!asideText || !kv || !state.cycle) return;

    const doneCount = Object.values(state.cycle.done || {}).filter(Boolean).length;
    asideText.textContent = "Perspective metrics (not pressure).";
    kv.innerHTML = `
      <div class="row"><span>Total days on Earth</span><b>${state.daysLived.toLocaleString()}</b></div>
      <div class="row"><span>Total hours</span><b>${state.hoursLived.toLocaleString()}</b></div>
      <div class="row"><span>Marked this cycle</span><b>${doneCount} / 36</b></div>
      <div class="row"><span>Cycle started</span><b>${state.cycleStartYMD}</b></div>
    `;
  }

  // ---------- Compute ----------
  function compute() {
    const dob = parseDob(state.dobStr);
    if (!dob) return null;

    const now = new Date();
    const dobDay = dayNumber(dob, state.mode);
    const todayDay = dayNumber(now, state.mode);
    if (todayDay < dobDay) return null;

    const daysLived = todayDay - dobDay;
    const dayInCycle = (daysLived % CYCLE_DAYS) + 1;
    const cycleIndex = cycleIndexFromDaysLived(daysLived);
    const hoursLived = Math.floor((now.getTime() - dob.getTime()) / 3600000);

    const cycleStartOffset = daysLived - (daysLived % CYCLE_DAYS);
    const cycleStart = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
    cycleStart.setDate(cycleStart.getDate() + cycleStartOffset);

    return {
      daysLived,
      hoursLived,
      dayInCycle,
      cycleIndex,
      cycleStartYMD: cycleStart.toISOString().slice(0, 10)
    };
  }

  function persistCycle() {
    if (!state.cycle || !state.dobStr) return;
    putCycle(store, state.dobStr, state.mode, state.cycleIndex, state.cycle);
  }

  function markDone() {
    state.cycle.done[String(state.dayInCycle)] = true;
    persistCycle();
    setDoneUI(true);
    showToast("Marked ✓");
  }

  function unmarkDone() {
    state.cycle.done[String(state.dayInCycle)] = false;
    persistCycle();
    setDoneUI(false);
    showToast("Unmarked");
  }

  function scheduleNoteAutosave() {
    if (!state.cycle || !noteBox) return;
    if (state.saveTimer) clearTimeout(state.saveTimer);
    setSaveIndicator("saving");
    state.saveTimer = setTimeout(() => {
      state.cycle.notes[String(state.dayInCycle)] = noteBox.value || "";
      persistCycle();
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

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function escapePlain(s) {
    return String(s || "").replace(/\r\n/g, "\n").trim();
  }

  // ---------- Review ----------
  function getReviewScope() {
    const checked = reviewScopeRadios.find((r) => r.checked);
    return checked ? checked.value : "cycle";
  }

  function buildReviewItems() {
    if (!state.dobStr) return [];
    const q = (reviewQuery?.value || "").trim().toLowerCase();
    const scope = getReviewScope();
    const onlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);

    const items = [];
    for (const [k, cycle] of Object.entries(store)) {
      if (!k.startsWith(`${state.dobStr}|${state.mode}|cycle`)) continue;
      if (scope === "cycle" && k !== onlyKey) continue;

      const m = k.match(/cycle(\d+)$/);
      const cIndex = m ? Number(m[1]) : null;

      const notes = cycle.notes || {};
      for (const [dayStr, note] of Object.entries(notes)) {
        const day = Number(dayStr);
        const text = escapePlain(note);
        if (!text) continue;

        const type = getDayType(day);
        const preview = text.replace(/\s+/g, " ").slice(0, 90);
        const hay = (preview + " " + text).toLowerCase();
        if (q && !hay.includes(q)) continue;

        items.push({ cycleIndex: cIndex, day, type, preview, full: text, storeKey: k });
      }
    }

    items.sort((a, b) => (b.cycleIndex - a.cycleIndex) || (b.day - a.day));
    return items;
  }

  function renderReview() {
    if (!noteList) return;
    const items = buildReviewItems();

    if (!items.length) {
      noteList.innerHTML =
        `<div class="noteItem"><div class="noteMeta"><b>No notes found</b><span>Write a note today, then review it here.</span></div><span class="badge light">—</span></div>`;
      if (reviewEditorWrap) reviewEditorWrap.hidden = true;
      state.selectedReviewItem = null;
      return;
    }

    noteList.innerHTML = items
      .map((it, idx) => {
        const label = `${it.type.toUpperCase()} • C${it.cycleIndex} D${it.day}`;
        const ell = it.full.length > it.preview.length ? "…" : "";
        return `
          <div class="noteItem" data-idx="${idx}">
            <div class="noteMeta">
              <b>${label}</b>
              <span>${it.preview}${ell}</span>
            </div>
            <span class="badge ${it.type}">${it.type}</span>
          </div>
        `;
      })
      .join("");

    noteList.querySelectorAll(".noteItem").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-idx"));
        const item = items[idx];
        openReviewEditor(item);
      });
    });
  }

  function openReviewEditor(item) {
    state.selectedReviewItem = item;
    if (!reviewEditorWrap || !reviewEditor) return;
    reviewEditorWrap.hidden = false;
    reviewEditor.value = item.full || "";
    if (reviewSaveText) reviewSaveText.textContent = "Autosave enabled";
    setTimeout(() => reviewEditor.focus(), 0);
  }

  function scheduleReviewAutosave() {
    if (!state.selectedReviewItem || !reviewEditor) return;
    if (state.reviewSaveTimer) clearTimeout(state.reviewSaveTimer);
    if (reviewSaveText) reviewSaveText.textContent = "Saving…";

    state.reviewSaveTimer = setTimeout(() => {
      const { storeKey, day } = state.selectedReviewItem;
      const cycle = store[storeKey];
      if (!cycle) return;

      cycle.notes[String(day)] = reviewEditor.value || "";
      cycle.updatedAt = Date.now();
      store[storeKey] = cycle;
      saveJSON(STORE_KEY, store);

      if (reviewSaveText) reviewSaveText.textContent = "Saved ✓";
      setTimeout(() => {
        if (reviewSaveText) reviewSaveText.textContent = "Autosave enabled";
      }, 900);

      render();
      renderReview();
    }, 650);
  }

  function exportNotesTXT() {
    if (!state.dobStr) return alert("Set your DOB first.");
    const scope = getReviewScope();
    const items = buildReviewItems().map((i) => ({
      cycle: i.cycleIndex,
      day: i.day,
      type: i.type,
      note: i.full
    }));

    const lines = [];
    lines.push("COSMIC 36 — NOTES EXPORT");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`DOB: ${state.dobStr}`);
    lines.push(`Mode: ${state.mode}`);
    lines.push(`Scope: ${scope}`);
    lines.push("------------------------------------------------------------");
    lines.push("");

    for (const it of items) {
      lines.push(`Cycle ${it.cycle} — Day ${it.day} (${it.type})`);
      lines.push("");
      lines.push(escapePlain(it.note));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    downloadTextFile(`cosmic36-notes-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"));
    showToast("Exported notes");
  }

  function exportCloseTXT() {
    if (!state.dobStr) return alert("Set your DOB first.");
    const scope = getReviewScope();
    const onlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);

    // For "this cycle": export only current cycle close
    // For "all time": export close blocks for every cycle we have stored
    const keys = Object.keys(store).filter((k) => k.startsWith(`${state.dobStr}|${state.mode}|cycle`));
    const targetKeys = scope === "cycle" ? keys.filter((k) => k === onlyKey) : keys;

    const lines = [];
    lines.push("COSMIC 36 — CLOSE THE CYCLE EXPORT");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`DOB: ${state.dobStr}`);
    lines.push(`Mode: ${state.mode}`);
    lines.push(`Scope: ${scope}`);
    lines.push("------------------------------------------------------------");
    lines.push("");

    const sorted = targetKeys.sort((a, b) => {
      const ca = Number((a.match(/cycle(\d+)$/) || [])[1] || 0);
      const cb = Number((b.match(/cycle(\d+)$/) || [])[1] || 0);
      return cb - ca;
    });

    if (!sorted.length) {
      lines.push("No close-the-cycle notes found.");
    }

    for (const k of sorted) {
      const m = k.match(/cycle(\d+)$/);
      const cIndex = m ? Number(m[1]) : "?";
      const c = store[k];
      const close = c?.close || {};

      const hasAnything = !!(escapePlain(close.lesson) || escapePlain(close.carry) || escapePlain(close.release));
      if (!hasAnything) continue;

      lines.push(`Cycle ${cIndex}`);
      lines.push("");
      lines.push("What did this cycle teach me?");
      lines.push(escapePlain(close.lesson));
      lines.push("");
      lines.push("What stays (what I carry forward)?");
      lines.push(escapePlain(close.carry));
      lines.push("");
      lines.push("What leaves (what I release)?");
      lines.push(escapePlain(close.release));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    downloadTextFile(`cosmic36-close-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"));
    showToast("Exported close notes");
  }

  function exportBothTXT() {
    // One file: close notes + daily notes
    if (!state.dobStr) return alert("Set your DOB first.");

    const scope = getReviewScope();
    const lines = [];
    lines.push("COSMIC 36 — FULL EXPORT (CLOSE + DAILY NOTES)");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`DOB: ${state.dobStr}`);
    lines.push(`Mode: ${state.mode}`);
    lines.push(`Scope: ${scope}`);
    lines.push("============================================================");
    lines.push("");

    // Close section
    lines.push("CLOSE THE CYCLE");
    lines.push("");
    lines.push("(If scope is 'All time', multiple cycles will appear.)");
    lines.push("");
    lines.push("------------------------------------------------------------");
    lines.push("");

    // reuse function logic inline (avoid 2 downloads)
    const onlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);
    const keys = Object.keys(store).filter((k) => k.startsWith(`${state.dobStr}|${state.mode}|cycle`));
    const targetKeys = scope === "cycle" ? keys.filter((k) => k === onlyKey) : keys;

    const sorted = targetKeys.sort((a, b) => {
      const ca = Number((a.match(/cycle(\d+)$/) || [])[1] || 0);
      const cb = Number((b.match(/cycle(\d+)$/) || [])[1] || 0);
      return cb - ca;
    });

    for (const k of sorted) {
      const m = k.match(/cycle(\d+)$/);
      const cIndex = m ? Number(m[1]) : "?";
      const c = store[k];
      const close = c?.close || {};

      const hasAnything = !!(escapePlain(close.lesson) || escapePlain(close.carry) || escapePlain(close.release));
      if (!hasAnything) continue;

      lines.push(`Cycle ${cIndex}`);
      lines.push("");
      lines.push("What did this cycle teach me?");
      lines.push(escapePlain(close.lesson));
      lines.push("");
      lines.push("What stays (what I carry forward)?");
      lines.push(escapePlain(close.carry));
      lines.push("");
      lines.push("What leaves (what I release)?");
      lines.push(escapePlain(close.release));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    lines.push("");
    lines.push("DAILY NOTES");
    lines.push("");
    lines.push("------------------------------------------------------------");
    lines.push("");

    const items = buildReviewItems().map((i) => ({
      cycle: i.cycleIndex,
      day: i.day,
      type: i.type,
      note: i.full
    }));

    for (const it of items) {
      lines.push(`Cycle ${it.cycle} — Day ${it.day} (${it.type})`);
      lines.push("");
      lines.push(escapePlain(it.note));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    downloadTextFile(`cosmic36-full-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"));
    showToast("Exported full TXT");
  }

  // ---------- MAIN RENDER ----------
  function render() {
    applyLayout();
    applyExperience();

    const info = compute();
    if (!info) {
      if (headerTitle) headerTitle.textContent = "Day — / 36";
      if (headerPhase) headerPhase.textContent = "Open Settings and enter your date of birth.";
      if (chipRow) chipRow.innerHTML = "";
      if (patternLine) {
        patternLine.textContent = "";
        patternLine.classList.remove("hasText");
      }
      if (bigDay) bigDay.innerHTML = `Day — <small>/ 36</small>`;
      if (guidanceLine) guidanceLine.textContent = "—";
      if (hintLine) hintLine.textContent = "—";
      if (insightBox) insightBox.hidden = true;
      if (notePrompt) notePrompt.textContent = "Mindful note";
      if (noteBox) noteBox.value = "";
      setDoneUI(false);
      setCardType("light");
      if (subLine) subLine.textContent = "One screen. One day. One note.";
      return;
    }

    state.daysLived = info.daysLived;
    state.hoursLived = info.hoursLived;
    state.dayInCycle = info.dayInCycle;
    state.cycleIndex = info.cycleIndex;
    state.cycleStartYMD = info.cycleStartYMD;

    state.cycle = getCycle(store, state.dobStr, state.mode, state.cycleIndex);

    const t = getDayType(state.dayInCycle);
    const phase = getPhase(state.dayInCycle);

    if (headerTitle) headerTitle.textContent = `Day ${state.dayInCycle} / 36`;
    if (headerPhase) headerPhase.textContent = `${phase.name} • ${phase.desc}`;
    if (bigDay) bigDay.innerHTML = `Day ${state.dayInCycle} <small>/ 36</small>`;
    setCardType(t);

    // --- Single Next Special (anchor OR echo) ---
    const nextA = nextSpecialDay(state.dayInCycle, ANCHORS);
    const nextE = nextSpecialDay(state.dayInCycle, ECHOES);

    const nextSpecial =
      (nextA && nextE)
        ? (nextA.inDays <= nextE.inDays
          ? { kind: "anchor", ...nextA }
          : { kind: "echo", ...nextE })
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

    // --- ONE pattern line (soonest of Day 1 or Day 18) ---
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

    // --- Guidance density rules ---
    const showGuidance = state.density !== "silent";
    const showHint = state.density !== "silent";
    const showInsight = state.density === "supportive"; // IMPORTANT: minimal = no spiritual insight

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

    // --- Notes ---
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

    // --- Done state ---
    const done = !!state.cycle.done[String(state.dayInCycle)];
    setDoneUI(done);

    renderAside();
  }

  function syncSettingsUI() {
    if (dobInput) dobInput.value = state.dobStr || "";
    modeRadios.forEach((r) => (r.checked = r.value === state.mode));
    if (densitySelect) densitySelect.value = state.density;
    gentleRadios.forEach((r) => (r.checked = r.value === (state.gentle ? "on" : "off")));
    experienceRadios.forEach((r) => (r.checked = r.value === state.experience));
  }

  // ---------- Events ----------
  if (layoutBtn) {
    layoutBtn.addEventListener("click", () => {
      state.layout = state.layout === "desktop" ? "mobile" : "desktop";
      persistSettings();
      render();
      showToast(state.layout === "desktop" ? "Desktop view" : "Mobile view");
    });
  }

  // Pattern ⓘ info
  if (patternInfoBtn) {
    patternInfoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTooltip) closeTooltip();
      else openTooltip(patternInfoBtn, PATTERN_INFO);
    });
  }

  // Mark done (no toggle from click)
  if (statusBtn) {
    statusBtn.addEventListener("click", () => {
      if (!state.cycle) return;
      const done = !!state.cycle.done[String(state.dayInCycle)];
      if (!done) markDone();
      else showToast("Already marked ✓ (swipe left to unmark)");
    });
  }

  if (noteBox) {
    noteBox.addEventListener("input", scheduleNoteAutosave);
    noteBox.addEventListener("blur", () => {
      if (!state.cycle) return;
      state.cycle.notes[String(state.dayInCycle)] = noteBox.value || "";
      persistCycle();
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

  // Settings dialog
  if (openSettings) openSettings.addEventListener("click", () => openDialog(settingsDialog, openSettings));
  if (closeSettings) closeSettings.addEventListener("click", () => closeDialog(settingsDialog, openSettings));
  if (settingsDialog) {
    settingsDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDialog(settingsDialog, openSettings);
    });
  }

  if (dobInput) {
    dobInput.addEventListener("change", () => {
      state.dobStr = dobInput.value || "";
      persistSettings();
      render();
    });
  }

  modeRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (!r.checked) return;
      state.mode = r.value;
      persistSettings();
      render();
    })
  );

  if (densitySelect) {
    densitySelect.addEventListener("change", () => {
      state.density = densitySelect.value;
      persistSettings();
      render();
    });
  }

  gentleRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (!r.checked) return;
      state.gentle = r.value === "on";
      persistSettings();
      render();
    })
  );

  experienceRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (!r.checked) return;
      state.experience = r.value;
      persistSettings();
      applyExperience();
      render();
      showToast(state.experience === "complete" ? "Complete mode" : "Compact mode");
    })
  );

  if (clearCycleBtn) {
    clearCycleBtn.addEventListener("click", () => {
      const info = compute();
      if (!info) return alert("Set your DOB first.");
      const k = cycleKey(state.dobStr, state.mode, info.cycleIndex);
      if (!confirm("Clear notes + marks for the current cycle on this device?")) return;
      delete store[k];
      saveJSON(STORE_KEY, store);
      render();
      showToast("Cleared");
    });
  }

  // Review dialog
  if (openReview) {
    openReview.addEventListener("click", () => {
      if (!state.dobStr) {
        openDialog(settingsDialog, openSettings);
        return;
      }
      openDialog(reviewDialog, openReview);
      renderReview();
      if (reviewQuery) reviewQuery.focus();
    });
  }

  if (closeReview) closeReview.addEventListener("click", () => closeDialog(reviewDialog, openReview));
  if (reviewDialog) {
    reviewDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDialog(reviewDialog, openReview);
    });
  }

  if (reviewQuery) reviewQuery.addEventListener("input", renderReview);
  reviewScopeRadios.forEach((r) => r.addEventListener("change", renderReview));
  if (reviewEditor) reviewEditor.addEventListener("input", scheduleReviewAutosave);

  if (jumpToTodayBtn) {
    jumpToTodayBtn.addEventListener("click", () => {
      closeDialog(reviewDialog, openReview);
      if (noteBox) noteBox.focus();
    });
  }

  // Exports (review)
  if (exportNotesTxtBtn) exportNotesTxtBtn.addEventListener("click", exportNotesTXT);
  if (exportCloseTxtBtn) exportCloseTxtBtn.addEventListener("click", exportCloseTXT);
  if (exportBothTxtBtn) exportBothTxtBtn.addEventListener("click", exportBothTXT);

  // Aside quick buttons (desktop)
  if (asideReviewBtn) {
    asideReviewBtn.addEventListener("click", () => {
      if (openReview) openReview.click();
    });
  }
  if (asideSettingsBtn) {
    asideSettingsBtn.addEventListener("click", () => {
      if (openSettings) openSettings.click();
    });
  }

  // Swipe gestures (mobile only)
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
      },
      { passive: true }
    );
  }

  // ---------- Init ----------
  function init() {
    const params = new URLSearchParams(location.search);
    const dobFromUrl = params.get("dob");
    if (dobFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dobFromUrl)) state.dobStr = dobFromUrl;

    syncSettingsUI();
    render();
    if (!state.dobStr) openDialog(settingsDialog, openSettings);
  }

  init();
});