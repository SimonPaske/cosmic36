import { STORE_KEY } from "../core/constants.js";
import { cycleKey, getDayType } from "../core/cycle.js";
import { saveJSON } from "../core/store.js";
import { $ } from "../ui/dom.js";
import { openDialog, closeDialog } from "../ui/dialog.js";
import { showToast } from "../ui/toast.js";

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapePlain(text) {
  return String(text || "").replace(/\r\n/g, "\n").trim();
}

export function initReview(state, store, { render, openSettingsDialog }) {
  const reviewDialog = $("reviewDialog");
  const openReview = $("openReview");
  const closeReview = $("closeReview");
  const reviewQuery = $("reviewQuery");
  const reviewScopeRadios = [...document.querySelectorAll('input[name="reviewScope"]')];
  const noteList = $("noteList");
  const reviewEditorWrap = $("reviewEditorWrap");
  const reviewEditor = $("reviewEditor");
  const reviewSaveText = $("reviewSaveText");
  const jumpToTodayBtn = $("jumpToTodayBtn");
  const exportNotesTxtBtn = $("exportNotesTxtBtn");
  const exportCloseTxtBtn = $("exportCloseTxtBtn");
  const exportBothTxtBtn = $("exportBothTxtBtn") || $("exportAllTxtBtn");
  const asideReviewBtn = $("asideReviewBtn");

  function getReviewScope() {
    const checked = reviewScopeRadios.find((r) => r.checked);
    return checked ? checked.value : "cycle";
  }

  function buildReviewItems() {
    if (!state.dobStr) return [];
    const q = (reviewQuery?.value || "").trim().toLowerCase();
    const scope = getReviewScope();
    const onlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);

    const items = [];
    for (const [key, cycle] of Object.entries(store)) {
      if (!key.startsWith(`${state.dobStr}|${state.mode}|cycle`)) continue;
      if (scope === "cycle" && key !== onlyKey) continue;

      const match = key.match(/cycle(\d+)$/);
      const cIndex = match ? Number(match[1]) : null;

      const notes = cycle.notes || {};
      for (const [dayStr, note] of Object.entries(notes)) {
        const day = Number(dayStr);
        const text = escapePlain(note);
        if (!text) continue;

        const type = getDayType(day);
        const preview = text.replace(/\s+/g, " ").slice(0, 90);
        const hay = (preview + " " + text).toLowerCase();
        if (q && !hay.includes(q)) continue;

        items.push({ cycleIndex: cIndex, day, type, preview, full: text, storeKey: key });
      }
    }

    items.sort((a, b) => (b.cycleIndex - a.cycleIndex) || (b.day - a.day));
    return items;
  }

  function renderReview() {
    if (!noteList) return;
    const items = buildReviewItems();

    if (!items.length) {
      noteList.innerHTML =
        `<div class="noteItem"><div class="noteMeta"><b>No notes found</b><span>Write a note today, then review it here.</span></div><span class="badge light">—</span></div>`;
      if (reviewEditorWrap) reviewEditorWrap.hidden = true;
      state.selectedReviewItem = null;
      return;
    }

    noteList.innerHTML = items
      .map((it, idx) => {
        const label = `${it.type.toUpperCase()} • C${it.cycleIndex} D${it.day}`;
        const ell = it.full.length > it.preview.length ? "…" : "";
        return `
          <div class="noteItem" data-idx="${idx}">
            <div class="noteMeta">
              <b>${label}</b>
              <span>${it.preview}${ell}</span>
            </div>
            <span class="badge ${it.type}">${it.type}</span>
          </div>
        `;
      })
      .join("");

    noteList.querySelectorAll(".noteItem").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-idx"));
        const item = items[idx];
        openReviewEditor(item);
      });
    });
  }

  function openReviewEditor(item) {
    state.selectedReviewItem = item;
    if (!reviewEditorWrap || !reviewEditor) return;
    reviewEditorWrap.hidden = false;
    reviewEditor.value = item.full || "";
    if (reviewSaveText) reviewSaveText.textContent = "Autosave enabled";
    setTimeout(() => reviewEditor.focus(), 0);
  }

  function scheduleReviewAutosave() {
    if (!state.selectedReviewItem || !reviewEditor) return;
    if (state.reviewSaveTimer) clearTimeout(state.reviewSaveTimer);
    if (reviewSaveText) reviewSaveText.textContent = "Saving…";

    state.reviewSaveTimer = setTimeout(() => {
      const { storeKey, day } = state.selectedReviewItem;
      const cycle = store[storeKey];
      if (!cycle) return;

      cycle.notes[String(day)] = reviewEditor.value || "";
      cycle.updatedAt = Date.now();
      store[storeKey] = cycle;
      saveJSON(STORE_KEY, store);

      if (reviewSaveText) reviewSaveText.textContent = "Saved ✓";
      setTimeout(() => {
        if (reviewSaveText) reviewSaveText.textContent = "Autosave enabled";
      }, 900);

      render();
      renderReview();
    }, 650);
  }

  function exportNotesTXT() {
    if (!state.dobStr) return alert("Set your DOB first.");
    const scope = getReviewScope();
    const items = buildReviewItems().map((i) => ({
      cycle: i.cycleIndex,
      day: i.day,
      type: i.type,
      note: i.full
    }));

    const lines = [];
    lines.push("COSMIC 36 — NOTES EXPORT");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`DOB: ${state.dobStr}`);
    lines.push(`Mode: ${state.mode}`);
    lines.push(`Scope: ${scope}`);
    lines.push("------------------------------------------------------------");
    lines.push("");

    for (const it of items) {
      lines.push(`Cycle ${it.cycle} — Day ${it.day} (${it.type})`);
      lines.push("");
      lines.push(escapePlain(it.note));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    downloadTextFile(`cosmic36-notes-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"));
    showToast("Exported notes");
  }

  function exportCloseTXT() {
    if (!state.dobStr) return alert("Set your DOB first.");
    const scope = getReviewScope();
    const onlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);

    const keys = Object.keys(store).filter((k) => k.startsWith(`${state.dobStr}|${state.mode}|cycle`));
    const targetKeys = scope === "cycle" ? keys.filter((k) => k === onlyKey) : keys;

    const lines = [];
    lines.push("COSMIC 36 — CLOSE THE CYCLE EXPORT");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`DOB: ${state.dobStr}`);
    lines.push(`Mode: ${state.mode}`);
    lines.push(`Scope: ${scope}`);
    lines.push("------------------------------------------------------------");
    lines.push("");

    const sorted = targetKeys.sort((a, b) => {
      const ca = Number((a.match(/cycle(\d+)$/) || [])[1] || 0);
      const cb = Number((b.match(/cycle(\d+)$/) || [])[1] || 0);
      return cb - ca;
    });

    if (!sorted.length) lines.push("No close-the-cycle notes found.");

    for (const key of sorted) {
      const match = key.match(/cycle(\d+)$/);
      const cIndex = match ? Number(match[1]) : "?";
      const cycle = store[key];
      const close = cycle?.close || {};

      const hasAnything = !!(escapePlain(close.lesson) || escapePlain(close.carry) || escapePlain(close.release));
      if (!hasAnything) continue;

      lines.push(`Cycle ${cIndex}`);
      lines.push("");
      lines.push("What did this cycle teach me?");
      lines.push(escapePlain(close.lesson));
      lines.push("");
      lines.push("What stays (what I carry forward)?");
      lines.push(escapePlain(close.carry));
      lines.push("");
      lines.push("What leaves (what I release)?");
      lines.push(escapePlain(close.release));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    downloadTextFile(`cosmic36-close-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"));
    showToast("Exported close notes");
  }

  function exportBothTXT() {
    if (!state.dobStr) return alert("Set your DOB first.");
    const scope = getReviewScope();

    const lines = [];
    lines.push("COSMIC 36 — FULL EXPORT (CLOSE + DAILY NOTES)");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`DOB: ${state.dobStr}`);
    lines.push(`Mode: ${state.mode}`);
    lines.push(`Scope: ${scope}`);
    lines.push("============================================================");
    lines.push("");

    lines.push("CLOSE THE CYCLE");
    lines.push("");
    lines.push("------------------------------------------------------------");
    lines.push("");

    const onlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);
    const keys = Object.keys(store).filter((k) => k.startsWith(`${state.dobStr}|${state.mode}|cycle`));
    const targetKeys = scope === "cycle" ? keys.filter((k) => k === onlyKey) : keys;

    const sorted = targetKeys.sort((a, b) => {
      const ca = Number((a.match(/cycle(\d+)$/) || [])[1] || 0);
      const cb = Number((b.match(/cycle(\d+)$/) || [])[1] || 0);
      return cb - ca;
    });

    for (const key of sorted) {
      const match = key.match(/cycle(\d+)$/);
      const cIndex = match ? Number(match[1]) : "?";
      const cycle = store[key];
      const close = cycle?.close || {};
      const hasAnything = !!(escapePlain(close.lesson) || escapePlain(close.carry) || escapePlain(close.release));
      if (!hasAnything) continue;

      lines.push(`Cycle ${cIndex}`);
      lines.push("");
      lines.push("What did this cycle teach me?");
      lines.push(escapePlain(close.lesson));
      lines.push("");
      lines.push("What stays (what I carry forward)?");
      lines.push(escapePlain(close.carry));
      lines.push("");
      lines.push("What leaves (what I release)?");
      lines.push(escapePlain(close.release));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    lines.push("");
    lines.push("DAILY NOTES");
    lines.push("");
    lines.push("------------------------------------------------------------");
    lines.push("");

    const items = buildReviewItems().map((i) => ({
      cycle: i.cycleIndex,
      day: i.day,
      type: i.type,
      note: i.full
    }));

    for (const it of items) {
      lines.push(`Cycle ${it.cycle} — Day ${it.day} (${it.type})`);
      lines.push("");
      lines.push(escapePlain(it.note));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    }

    downloadTextFile(`cosmic36-full-${new Date().toISOString().slice(0, 10)}.txt`, lines.join("\n"));
    showToast("Exported full TXT");
  }

  function openReviewDialog() {
    if (!state.dobStr) {
      if (openSettingsDialog) openSettingsDialog();
      return;
    }
    openDialog(reviewDialog, openReview);
    renderReview();
    if (reviewQuery) reviewQuery.focus();
  }

  if (openReview) openReview.addEventListener("click", openReviewDialog);
  if (asideReviewBtn) asideReviewBtn.addEventListener("click", openReviewDialog);

  if (closeReview) closeReview.addEventListener("click", () => closeDialog(reviewDialog, openReview));
  if (reviewDialog) {
    reviewDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDialog(reviewDialog, openReview);
    });
  }

  if (reviewQuery) reviewQuery.addEventListener("input", renderReview);
  reviewScopeRadios.forEach((r) => r.addEventListener("change", renderReview));
  if (reviewEditor) reviewEditor.addEventListener("input", scheduleReviewAutosave);

  if (jumpToTodayBtn) {
    jumpToTodayBtn.addEventListener("click", () => {
      closeDialog(reviewDialog, openReview);
      const noteBox = $("noteBox");
      if (noteBox) noteBox.focus();
    });
  }

  if (exportNotesTxtBtn) exportNotesTxtBtn.addEventListener("click", exportNotesTXT);
  if (exportCloseTxtBtn) exportCloseTxtBtn.addEventListener("click", exportCloseTXT);
  if (exportBothTxtBtn) exportBothTxtBtn.addEventListener("click", exportBothTXT);

  return { renderReview, openReviewDialog };
}
