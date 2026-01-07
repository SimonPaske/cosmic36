import { CYCLE_DAYS } from "../core/constants.js";
import { getDayType } from "../core/cycle.js";
import { $ } from "../ui/dom.js";

let progressBarEl = null;

function ensureProgressBarMount() {
  if (progressBarEl) return;
  progressBarEl = $("progressBar");
}

export function renderProgressBar(state, { onSelectDay } = {}) {
  if (!state.cycle) return;
  ensureProgressBarMount();
  if (!progressBarEl) return;

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
    const isDone = !!state.cycle.done[String(d)];
    const hasNote = !!(state.cycle.notes[String(d)] || "").trim();

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
      if (!state.cycle) return;
      if (onSelectDay) onSelectDay(d);
    });

    frag.appendChild(btn);
  }

  progressBarEl.innerHTML = "";
  progressBarEl.appendChild(frag);
}
