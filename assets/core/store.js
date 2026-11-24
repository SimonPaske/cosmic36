import { STORE_KEY } from "./constants.js";

export function loadJSON(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Write a value to localStorage. Returns false (and emits
 * `cosmic36:storage-error`) instead of throwing when storage is full or
 * unavailable, so a failed save never breaks the UI mid-typing.
 */
export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}`, error);
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("cosmic36:storage-error", { detail: { key, error } }));
    }
    return false;
  }
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("cosmic36:localstorage-saved", { detail: { key } }));
  }
  return true;
}

export function loadStore() {
  return loadJSON(STORE_KEY, {});
}

export function saveStore(store) {
  return saveJSON(STORE_KEY, store);
}

let persistRequested = false;

/**
 * Ask the browser not to evict our data under storage pressure (and, on
 * Safari, after 7 days without a visit). Granted automatically for installed
 * PWAs / engaged sites; harmless if denied.
 */
export async function requestPersistentStorage() {
  if (persistRequested) return null;
  persistRequested = true;
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
