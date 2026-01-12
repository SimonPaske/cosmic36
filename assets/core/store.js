import { STORE_KEY } from "./constants.js";

export function loadJSON(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("cosmic36:localstorage-saved", { detail: { key } }));
  }
}

export function loadStore() {
  return loadJSON(STORE_KEY, {});
}

export function saveStore(store) {
  saveJSON(STORE_KEY, store);
}
