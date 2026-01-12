import { $ } from "./dom.js";

export function showToast(message, tone = "info") {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("toast--warn");
  if (tone === "warn") toast.classList.add("toast--warn");
  if (typeof toast.show === "function") {
    if (toast.open && typeof toast.close === "function") toast.close();
    toast.show();
  }
  toast.classList.add("show");
  window.clearTimeout(toast._timer);
  window.clearTimeout(toast._closeTimer);
  toast._timer = window.setTimeout(() => {
    toast.classList.remove("show");
    if (typeof toast.close === "function" && toast.open) {
      toast._closeTimer = window.setTimeout(() => {
        if (toast.open) toast.close();
      }, 180);
    }
  }, 900);
}
