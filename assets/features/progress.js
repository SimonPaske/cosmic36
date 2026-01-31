import { CYCLE_DAYS } from "../core/constants.js";
import { getDayType } from "../core/cycle.js";
import { $ } from "../ui/dom.js";

let progressBarEl = null;
let historyRowEl = null;
let streakNowEl = null;
let streakBestEl = null;
let markedCountEl = null;
let progressSectionEl = null;
let historySectionEl = null;

function ensureProgressBarMount() {
  if (progressBarEl && document.contains(progressBarEl)) return;
  progressBarEl = $("progressBar");
  historyRowEl = $("historyRow");
  streakNowEl = $("streakNow");
  streakBestEl = $("streakBest");
  markedCountEl = $("markedCount");
  progressSectionEl = $("progressSection");
  historySectionEl = $("historySection");
}

export function renderProgressBar(state, store, { onSelectDay } = {}) {
  ensureProgressBarMount();
  if (progressSectionEl && historySectionEl) {
    const showHistory = state.progressView === "history";
    progressSectionEl.hidden = showHistory;
    historySectionEl.hidden = !showHistory;
  }
  if (!progressBarEl) return;

  const cycle = state.cycle || { done: {}, notes: {}, intention: {}, reflection: {}, close: {} };
  const today = state.dayInCycle || 1;
  const frag = document.createDocumentFragment();
  let lightIndex = 0;

  for (let d = 1; d <= CYCLE_DAYS; d++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dayBtn";

    const type = getDayType(d);
    if (type === "light") {
      btn.classList.add("light");
      lightIndex += 1;
      btn.classList.add(lightIndex % 2 ? "odd" : "even");
    } else {
      btn.classList.add(type);
    }

    const isToday = d === today;
    const isPast = d < today;
    const isDone = !!cycle.done[String(d)];
    const hasNote = !!(cycle.notes[String(d)] || "").trim();

    if (isToday) btn.classList.add("today");
    if (isPast) btn.classList.add("past");
    if (isDone) btn.classList.add("done");
    if (hasNote) btn.classList.add("hasNote");

    btn.setAttribute(
      "aria-label",
      `Day ${d}${isToday ? ", today" : ""}${isDone ? ", marked" : ""}`
    );

    btn.innerHTML = `
      <span class="dayNum">${d}</span>
      <span class="dayDots" aria-hidden="true">
        <span class="noteDot"></span>
        <span class="doneDot"></span>
      </span>
    `;

    btn.addEventListener("click", () => {
      if (!cycle) return;
      if (onSelectDay) onSelectDay(d);
    });

    frag.appendChild(btn);
  }

  progressBarEl.innerHTML = "";
  progressBarEl.appendChild(frag);

  if (historyRowEl && state.progressView === "history") {
    renderHistory(state, store, { onSelectDay });
  }
}

function computeCurrentStreak(state, today) {
  let streak = 0;
  let missRun = 0;
  for (let d = today; d >= 1; d--) {
    const marked = !!state.cycle?.done?.[String(d)];
    if (marked) {
      streak += 1;
      missRun = 0;
      continue;
    }
    missRun += 1;
    if (missRun >= 3) {
      break;
    }
  }
  return streak;
}

function computeBestStreak(state, today) {
  let best = 0;
  let run = 0;
  for (let d = 1; d <= today; d++) {
    if (state.cycle?.done?.[String(d)]) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function computeUsageStats(store) {
  if (!store) return { notesCount: 0, wordsCount: 0 };
  let notesCount = 0;
  let wordsCount = 0;
  for (const [key, cycle] of Object.entries(store)) {
    if (!key.includes("|cycle") || !cycle) continue;
    const notes = cycle.notes || {};
    const intention = cycle.intention || {};
    const reflection = cycle.reflection || {};
    const close = cycle.close || {};
    for (const val of Object.values(notes)) {
      if ((val || "").trim()) notesCount += 1;
      wordsCount += countWords(val);
    }
    for (const val of Object.values(intention)) {
      if ((val || "").trim()) notesCount += 1;
      wordsCount += countWords(val);
    }
    for (const val of Object.values(reflection)) {
      if ((val || "").trim()) notesCount += 1;
      wordsCount += countWords(val);
    }
    for (const val of [close.lesson, close.carry, close.release]) {
      if ((val || "").trim()) notesCount += 1;
      wordsCount += countWords(val);
    }
  }
  return { notesCount, wordsCount };
}

function renderHistory(state, store, { onSelectDay } = {}) {
  if (!historyRowEl) return;
  const today = state.dayInCycle || 1;
  const doneCount = Object.values(state.cycle?.done || {}).filter(Boolean).length;

  const streakNow = computeCurrentStreak(state, today);
  const streakBest = computeBestStreak(state, today);
  if (streakNowEl) streakNowEl.textContent = `Streak: ${streakNow}`;
  if (streakBestEl) streakBestEl.textContent = `Best: ${streakBest}`;
  if (markedCountEl) markedCountEl.textContent = `Marked: ${doneCount} / 36`;
  const streakCountBig = $("streakCountBig");
  if (streakCountBig) streakCountBig.textContent = `${streakNow} / 36`;
  const streakSub = $("streakSub");
  if (streakSub) {
    streakSub.textContent = streakNow >= 7 ? "Full week streak 🔥" : "Keep the rhythm.";
  }
  const { notesCount, wordsCount } = computeUsageStats(store);
  const timeInApp = $("timeInApp");
  if (timeInApp) timeInApp.textContent = formatDuration(state.usageMs || 0);
  const wordsWritten = $("wordsWritten");
  if (wordsWritten) wordsWritten.textContent = wordsCount.toLocaleString();
  const notesLeft = $("notesLeft");
  if (notesLeft) notesLeft.textContent = notesCount.toLocaleString();

  const frag = document.createDocumentFragment();
  let lightIndex = 0;
  let missRun = 0;
  for (let d = today; d >= 1; d--) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "historyDayBtn";

    const type = getDayType(d);
    if (type === "light") {
      btn.classList.add("light");
      lightIndex += 1;
      btn.classList.add(lightIndex % 2 ? "odd" : "even");
    } else {
      btn.classList.add(type);
    }

    const isToday = d === today;
    const isPast = d < today;
    const isDone = !!state.cycle?.done?.[String(d)];
    const hasNote = !!(state.cycle?.notes?.[String(d)] || "").trim();

    if (isToday) btn.classList.add("today");
    if (isPast) btn.classList.add("past");
    if (isDone) btn.classList.add("done");
    if (hasNote) btn.classList.add("hasNote");

    btn.setAttribute(
      "aria-label",
      `Day ${d}${isToday ? ", today" : ""}${isDone ? ", marked" : ""}${hasNote ? ", note" : ""}`
    );

    btn.innerHTML = `
      <span class="historyDayNum">D${d}</span>
      <span class="historyDayDots" aria-hidden="true">
        <span class="noteDot"></span>
        <span class="doneDot"></span>
      </span>
    `;

    btn.addEventListener("click", () => {
      if (!state.cycle) return;
      if (onSelectDay) onSelectDay(d);
    });

    frag.appendChild(btn);

    if (!isDone) {
      missRun += 1;
      if (missRun >= 3) break;
    } else {
      missRun = 0;
    }
  }

  historyRowEl.innerHTML = "";
  historyRowEl.appendChild(frag);
}
