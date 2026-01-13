import { $ } from "./dom.js";
import { openDialog, closeDialog } from "./dialog.js";

let confirmResolve = null;
let noticeResolve = null;

function ensureConfirmBindings() {
  const dialog = $("confirmDialog");
  const okBtn = $("confirmOk");
  const cancelBtn = $("confirmCancel");
  if (!dialog || !okBtn || !cancelBtn || dialog._bound) return;

  const closeWith = (value) => {
    if (confirmResolve) confirmResolve(value);
    confirmResolve = null;
    closeDialog(dialog);
  };

  okBtn.addEventListener("click", () => closeWith(true));
  cancelBtn.addEventListener("click", () => closeWith(false));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeWith(false);
  });
  dialog._bound = true;
}

function ensureNoticeBindings() {
  const dialog = $("infoDialog");
  const closeBtn = $("infoClose");
  if (!dialog || !closeBtn || dialog._bound) return;

  const closeWith = () => {
    if (noticeResolve) noticeResolve();
    noticeResolve = null;
    closeDialog(dialog);
  };

  closeBtn.addEventListener("click", closeWith);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeWith();
  });
  dialog._bound = true;
}

export function showConfirm({ title, message, confirmText = "OK", cancelText = "Cancel", tone = "" }) {
  const dialog = $("confirmDialog");
  const titleEl = $("confirmTitle");
  const messageEl = $("confirmMessage");
  const okBtn = $("confirmOk");
  const cancelBtn = $("confirmCancel");

  if (!dialog || !titleEl || !messageEl || !okBtn || !cancelBtn) {
    return Promise.resolve(window.confirm(message || "Are you sure?"));
  }

  ensureConfirmBindings();

  titleEl.textContent = title || "Confirm";
  messageEl.textContent = message || "";
  okBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  okBtn.classList.toggle("dangerBtn", tone === "danger");

  return new Promise((resolve) => {
    confirmResolve = resolve;
    openDialog(dialog);
  });
}

export function showNotice({ title, message, closeText = "Close" }) {
  const dialog = $("infoDialog");
  const titleEl = $("infoTitle");
  const messageEl = $("infoMessage");
  const closeBtn = $("infoClose");

  if (!dialog || !titleEl || !messageEl || !closeBtn) {
    window.alert(message || "");
    return Promise.resolve();
  }

  ensureNoticeBindings();

  titleEl.textContent = title || "Notice";
  messageEl.textContent = message || "";
  closeBtn.textContent = closeText;

  return new Promise((resolve) => {
    noticeResolve = resolve;
    openDialog(dialog);
  });
}
