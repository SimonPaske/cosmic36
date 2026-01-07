export function toUtcDayNumber(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function toLocalDayNumber(date) {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
}

export function dayNumber(date, mode = "utc") {
  return mode === "local" ? toLocalDayNumber(date) : toUtcDayNumber(date);
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatYMD(date, mode = "utc") {
  const y = mode === "utc" ? date.getUTCFullYear() : date.getFullYear();
  const m = mode === "utc" ? date.getUTCMonth() + 1 : date.getMonth() + 1;
  const d = mode === "utc" ? date.getUTCDate() : date.getDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseDob(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDaysToDayNumber(todayDayNumber, addDays) {
  return new Date((todayDayNumber + addDays) * 86400000);
}
