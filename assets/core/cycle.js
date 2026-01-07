import { CYCLE_DAYS, ANCHORS, ECHOES } from "./constants.js";
import { dayNumber, parseDob, addDaysToDayNumber } from "./time.js";
import { saveStore } from "./store.js";

export function getDayType(day) {
  if (ANCHORS.has(day)) return "anchor";
  if (ECHOES.has(day)) return "echo";
  return "light";
}

export function getPhase(day) {
  return day <= 18
    ? { name: "Phase 1: Sending", desc: "Imprint through repetition. Pressure days carry the charge." }
    : { name: "Phase 2: Receiving", desc: "Repeat and observe what returns. Let life respond." };
}

export function nextOccurrenceInCycle(currentDay, targetDay, cycleDays = CYCLE_DAYS) {
  return (targetDay - currentDay + cycleDays) % cycleDays;
}

export function computeNextPatternStarts(dobStr, mode) {
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

export function nextSpecialDay(fromDay, set) {
  for (let i = 0; i < CYCLE_DAYS; i++) {
    const d = ((fromDay - 1 + i) % CYCLE_DAYS) + 1;
    if (set.has(d)) return { day: d, inDays: i };
  }
  return null;
}

export function cycleIndexFromDaysLived(daysLived) {
  return Math.floor(daysLived / CYCLE_DAYS) + 1;
}

export function cycleKey(dobStr, mode, cycleIndex) {
  return `${dobStr}|${mode}|cycle${cycleIndex}`;
}

export function getCycle(store, dobStr, mode, cycleIndex) {
  const key = cycleKey(dobStr, mode, cycleIndex);
  return (
    store[key] || {
      updatedAt: Date.now(),
      done: {},
      notes: {},
      intention: {},
      reflection: {},
      close: { lesson: "", carry: "", release: "" }
    }
  );
}

export function putCycle(store, dobStr, mode, cycleIndex, cycle) {
  const key = cycleKey(dobStr, mode, cycleIndex);
  cycle.updatedAt = Date.now();
  store[key] = cycle;
  saveStore(store);
}

export function computeCycleMeta(dobStr, mode) {
  const dob = parseDob(dobStr);
  if (!dob) return null;

  const now = new Date();
  const dobDay = dayNumber(dob, mode);
  const todayDay = dayNumber(now, mode);
  if (todayDay < dobDay) return null;
  const daysLived = todayDay - dobDay;

  const dayInCycle = (daysLived % CYCLE_DAYS) + 1;
  const cycleIndex = cycleIndexFromDaysLived(daysLived);

  const cycleStartOffset = daysLived - (daysLived % CYCLE_DAYS);
  const cycleStart = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
  cycleStart.setDate(cycleStart.getDate() + cycleStartOffset);

  return {
    daysLived,
    dayInCycle,
    cycleIndex,
    cycleStartYMD: cycleStart.toISOString().slice(0, 10),
    hoursLived: Math.floor((now.getTime() - dob.getTime()) / 3600000)
  };
}
