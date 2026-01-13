import { $ } from "./dom.js";

export function showToast(message, tone = "info") {
  const toast = $("toast");
  if (!toast) return;
  const textEl = toast.querySelector(".toastText");
  const iconEl = toast.querySelector(".toastIcon");
  if (textEl) textEl.textContent = message;
  else toast.textContent = message;

  toast.classList.remove("toast--info", "toast--success", "toast--warn", "toast--error");
  toast.classList.add(`toast--${tone}`);

  const iconMap = {
    info: "ⓘ",
    success: "✓",
    warn: "!",
    error: "×"
  };
  if (iconEl) iconEl.textContent = iconMap[tone] || "ⓘ";

  if (navigator?.vibrate) {
    const pattern = tone === "warn" || tone === "error" ? [20] : tone === "success" ? [12] : [8];
    navigator.vibrate(pattern);
  }
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
  }, 900);
}
