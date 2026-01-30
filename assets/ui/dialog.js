const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function trapFocus(dialogEl) {
  const focusables = Array.from(dialogEl.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null
  );
  if (focusables.length === 0) return null;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  const handler = (event) => {
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  dialogEl.addEventListener("keydown", handler);
  return handler;
}

export function openDialog(dialogEl, openerBtn) {
  if (openerBtn) openerBtn.setAttribute("aria-expanded", "true");
  if (!dialogEl) return;

  const body = document.body;
  const count = Number(body.dataset.modalCount || 0) + 1;
  body.dataset.modalCount = String(count);
  body.classList.add("modal-open");

  dialogEl._returnFocus = document.activeElement;
  if (typeof dialogEl.showModal === "function") dialogEl.showModal();
  else dialogEl.setAttribute("open", "");

  if (!dialogEl._trapHandler) {
    dialogEl._trapHandler = trapFocus(dialogEl);
  }
  let focusTarget = dialogEl.querySelector(FOCUSABLE);
  if (!focusTarget) {
    dialogEl.setAttribute("tabindex", "-1");
    focusTarget = dialogEl;
  }
  focusTarget.focus?.();
}

export function closeDialog(dialogEl, openerBtn) {
  if (!dialogEl) return;
  if (openerBtn) openerBtn.setAttribute("aria-expanded", "false");
  if (typeof dialogEl.close === "function") dialogEl.close();
  else dialogEl.removeAttribute("open");
  if (dialogEl._trapHandler) {
    dialogEl.removeEventListener("keydown", dialogEl._trapHandler);
    dialogEl._trapHandler = null;
  }
  if (openerBtn) openerBtn.focus();
  else dialogEl._returnFocus?.focus?.();

  const body = document.body;
  const count = Math.max(0, Number(body.dataset.modalCount || 0) - 1);
  if (count === 0) {
    delete body.dataset.modalCount;
    body.classList.remove("modal-open");
  } else {
    body.dataset.modalCount = String(count);
  }
}
