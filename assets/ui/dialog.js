export function openDialog(dialogEl, openerBtn) {
  if (openerBtn) openerBtn.setAttribute("aria-expanded", "true");
  if (dialogEl && typeof dialogEl.showModal === "function") dialogEl.showModal();
  else if (dialogEl) dialogEl.setAttribute("open", "");
}

export function closeDialog(dialogEl, openerBtn) {
  if (openerBtn) openerBtn.setAttribute("aria-expanded", "false");
  if (dialogEl && typeof dialogEl.close === "function") dialogEl.close();
  else if (dialogEl) dialogEl.removeAttribute("open");
  if (openerBtn) openerBtn.focus();
}