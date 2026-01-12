import { $ } from "./dom.js";

export function showToast(message, tone = "info") {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("toast--warn");
  if (tone === "warn") toast.classList.add("toast--warn");
  if (typeof toast.showPopover === "function") {
    try {
      if (toast.matches(":popover-open")) toast.hidePopover();
      toast.showPopover();
    } catch {}
  }
  toast.classList.add("show");
  window.clearTimeout(toast._timer);
  window.clearTimeout(toast._closeTimer);
  toast._timer = window.setTimeout(() => {
    toast.classList.remove("show");
    if (typeof toast.hidePopover === "function") {
      toast._closeTimer = window.setTimeout(() => {
        try {
          if (toast.matches(":popover-open")) toast.hidePopover();
        } catch {}
      }, 200);
    }
  }, 1500);
}
