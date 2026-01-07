import { $ } from "./dom.js";

export function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => toast.classList.remove("show"), 900);
}
