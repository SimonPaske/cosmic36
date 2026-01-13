import { STORE_KEY } from "../core/constants.js";
import { cycleKey, getDayType } from "../core/cycle.js";
import { saveJSON } from "../core/store.js";
import { $ } from "../ui/dom.js";
import { openDialog, closeDialog } from "../ui/dialog.js";
import { showToast } from "../ui/toast.js";
import { showNotice } from "../ui/confirm.js";

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
  const reviewTitle = $("reviewTitle");
  const openReview = $("openReview");
  const closeReview = $("closeReview");
  const reviewQuery = $("reviewQuery");
  const reviewScopeRadios = [...document.querySelectorAll('input[name="reviewScope"]')];
  const reviewFilterDaily = $("reviewFilterDaily");
  const reviewFilterExtra = $("reviewFilterExtra");
  const reviewFilterCycle = $("reviewFilterCycle");
  const noteList = $("noteList");
  const reviewEditorWrap = $("reviewEditorWrap");
  const reviewEditor = $("reviewEditor");
  const reviewSaveText = $("reviewSaveText");
  const jumpToTodayBtn = $("jumpToTodayBtn");
  const exportNotesTxtBtn = $("exportNotesTxtBtn");
  const exportCloseTxtBtn = $("exportCloseTxtBtn");
  const exportBothTxtBtn = $("exportBothTxtBtn") || $("exportAllTxtBtn");
  const asideReviewBtn = $("asideReviewBtn");

  const reviewQueryField = reviewQuery?.closest(".field");
  const reviewScopeField = reviewScopeRadios[0]?.closest(".field");
  const reviewFilterField = $("reviewFilterField");
  const reviewExportsField = exportNotesTxtBtn?.closest(".field");

  let reviewMode = "list";
  let selectedDay = null;

  function setReviewMode(mode, day = null) {
    reviewMode = mode;
    selectedDay = day;
    const isDay = reviewMode === "day";
    if (isDay) state.selectedReviewItem = null;
    if (reviewTitle) {
      reviewTitle.textContent = isDay && selectedDay ? `Day ${selectedDay} notes` : "Review your notes";
    }
    if (reviewQueryField) reviewQueryField.hidden = isDay;
    if (reviewScopeField) reviewScopeField.hidden = isDay;
    if (reviewFilterField) reviewFilterField.hidden = isDay;
    if (reviewExportsField) reviewExportsField.hidden = isDay;
  }

  function getReviewScope() {
    const checked = reviewScopeRadios.find((r) => r.checked);
    return checked ? checked.value : "cycle";
  }

  function getReviewFilters() {
    return {
      daily: reviewFilterDaily ? reviewFilterDaily.checked : true,
      extra: reviewFilterExtra ? reviewFilterExtra.checked : true,
      cycle: reviewFilterCycle ? reviewFilterCycle.checked : true
    };
  }

  function buildReviewItems() {
    if (!state.dobStr) return [];
    const q = (reviewQuery?.value || "").trim().toLowerCase();
    const scope = getReviewScope();
    const filters = getReviewFilters();
    const onlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);

    const items = [];
    for (const [key, cycle] of Object.entries(store)) {
      if (!key.startsWith(`${state.dobStr}|${state.mode}|cycle`)) continue;
      if (scope === "cycle" && key !== onlyKey) continue;

      const match = key.match(/cycle(\d+)$/);
      const cIndex = match ? Number(match[1]) : null;

      if (filters.daily) {
        const notes = cycle.notes || {};
        for (const [dayStr, note] of Object.entries(notes)) {
          const day = Number(dayStr);
          const text = escapePlain(note);
          if (!text) continue;
          const label = `NOTE • C${cIndex} D${day}`;
          const preview = text.replace(/\s+/g, " ").slice(0, 90);
          const hay = (label + " " + preview + " " + text).toLowerCase();
          if (q && !hay.includes(q)) continue;

          items.push({
            cycleIndex: cIndex,
            day,
            kind: "note",
            label,
            badgeClass: getDayType(day),
            badgeLabel: getDayType(day),
            preview,
            full: text,
            storeKey: key,
            editable: true
          });
        }
      }

      if (filters.extra) {
        const intentions = cycle.intention || {};
        for (const [dayStr, note] of Object.entries(intentions)) {
          const day = Number(dayStr);
          const text = escapePlain(note);
          if (!text) continue;
          const label = `INTENTION • C${cIndex} D${day}`;
          const preview = text.replace(/\s+/g, " ").slice(0, 90);
          const hay = (label + " " + preview + " " + text).toLowerCase();
          if (q && !hay.includes(q)) continue;
          items.push({
            cycleIndex: cIndex,
            day,
            kind: "intention",
            label,
            badgeClass: "light",
            badgeLabel: "Intention",
            preview,
            full: text,
            storeKey: key,
            editable: true
          });
        }

        const reflections = cycle.reflection || {};
        for (const [dayStr, note] of Object.entries(reflections)) {
          const day = Number(dayStr);
          const text = escapePlain(note);
          if (!text) continue;
          const label = `REFLECTION • C${cIndex} D${day}`;
          const preview = text.replace(/\s+/g, " ").slice(0, 90);
          const hay = (label + " " + preview + " " + text).toLowerCase();
          if (q && !hay.includes(q)) continue;
          items.push({
            cycleIndex: cIndex,
            day,
            kind: "reflection",
            label,
            badgeClass: "light",
            badgeLabel: "Reflection",
            preview,
            full: text,
            storeKey: key,
            editable: true
          });
        }
      }

      const close = cycle.close || {};
      const closeLines = [];
      const lesson = escapePlain(close.lesson);
      const carry = escapePlain(close.carry);
      const release = escapePlain(close.release);

      if (lesson) closeLines.push(`Lesson: ${lesson}`);
      if (carry) closeLines.push(`Carry: ${carry}`);
      if (release) closeLines.push(`Release: ${release}`);

      if (filters.cycle && closeLines.length) {
        const text = closeLines.join("\n");
        const label = `CLOSE CYCLE • C${cIndex}`;
        const preview = text.replace(/\s+/g, " ").slice(0, 90);
        const hay = (label + " " + preview + " " + text).toLowerCase();
        if (q && !hay.includes(q)) continue;
        items.push({
          cycleIndex: cIndex,
          day: 0,
          kind: "close",
          label,
          badgeClass: "light",
          badgeLabel: "Cycle",
          preview,
          full: text,
          storeKey: key,
          editable: false
        });
      }
    }

    items.sort((a, b) => (b.cycleIndex - a.cycleIndex) || (b.day - a.day));
    return items;
  }

  function buildDayReviewItems(day) {
    if (!state.cycle) return [];
    const dayKey = String(day);
    const items = [];

    const note = escapePlain(state.cycle.notes?.[dayKey]);
    if (note) {
      items.push({
        label: "Note",
        badge: getDayType(day),
        text: note
      });
    }

    const intention = escapePlain(state.cycle.intention?.[dayKey]);
    if (intention) {
      items.push({
        label: "Intention",
        badge: "light",
        text: intention
      });
    }

    const reflection = escapePlain(state.cycle.reflection?.[dayKey]);
    if (reflection) {
      items.push({
        label: "Reflection",
        badge: "light",
        text: reflection
      });
    }

    const close = state.cycle.close || {};
    const closeLines = [];
    const lesson = escapePlain(close.lesson);
    const carry = escapePlain(close.carry);
    const release = escapePlain(close.release);

    if (lesson) closeLines.push(`Lesson: ${lesson}`);
    if (carry) closeLines.push(`Carry: ${carry}`);
    if (release) closeLines.push(`Release: ${release}`);

    if (closeLines.length) {
      items.push({
        label: "Cycle note",
        badge: "light",
        text: closeLines.join("\n")
      });
    }

    return items;
  }

  function renderDayReview(day) {
    if (!noteList) return;
    const items = buildDayReviewItems(day);

    if (!items.length) {
      noteList.innerHTML =
        `<div class="noteItem"><div class="noteMeta"><b>No notes found</b><span>Write a note on Day ${day}, then it will show here.</span></div><span class="badge light">—</span></div>`;
      if (reviewEditorWrap) reviewEditorWrap.hidden = true;
      return;
    }

    noteList.innerHTML = items
      .map((it) => {
        const text = it.text.replace(/\n/g, "<br>");
        return `
          <div class="noteItem">
            <div class="noteMeta">
              <b>${it.label}</b>
              <span>${text}</span>
            </div>
            <span class="badge ${it.badge}">${it.label}</span>
          </div>
        `;
      })
      .join("");

    if (reviewEditorWrap) reviewEditorWrap.hidden = true;
  }

  function renderReview() {
    if (!noteList) return;
    if (reviewMode === "day" && selectedDay) {
      renderDayReview(selectedDay);
      return;
    }

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
        const ell = it.full.length > it.preview.length ? "…" : "";
        return `
          <div class="noteItem" data-idx="${idx}">
            <div class="noteMeta">
              <b>${it.label}</b>
              <span>${it.preview}${ell}</span>
            </div>
            <span class="badge ${it.badgeClass}">${it.badgeLabel}</span>
          </div>
        `;
      })
      .join("");

    noteList.querySelectorAll(".noteItem").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-idx"));
        const item = items[idx];
        if (item.editable) openReviewEditor(item);
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
      const { storeKey, day, kind } = state.selectedReviewItem;
      const cycle = store[storeKey];
      if (!cycle) return;

      if (kind === "note") cycle.notes[String(day)] = reviewEditor.value || "";
      if (kind === "intention") {
        if (!cycle.intention) cycle.intention = {};
        cycle.intention[String(day)] = reviewEditor.value || "";
      }
      if (kind === "reflection") {
        if (!cycle.reflection) cycle.reflection = {};
        cycle.reflection[String(day)] = reviewEditor.value || "";
      }
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

  async function exportNotesTXT() {
    if (!state.dobStr) {
      await showNotice({ title: "Missing date of birth", message: "Set your DOB first." });
      return;
    }
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
    showToast("Exported notes", "success");
  }

  async function exportCloseTXT() {
    if (!state.dobStr) {
      await showNotice({ title: "Missing date of birth", message: "Set your DOB first." });
      return;
    }
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
    showToast("Exported close notes", "success");
  }

  async function exportBothTXT() {
    if (!state.dobStr) {
      await showNotice({ title: "Missing date of birth", message: "Set your DOB first." });
      return;
    }
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
    showToast("Exported full TXT", "success");
  }

  function openReviewDialog() {
    if (!state.dobStr) {
      if (openSettingsDialog) openSettingsDialog();
      return;
    }
    setReviewMode("list");
    openDialog(reviewDialog, openReview);
    renderReview();
    if (reviewQuery) reviewQuery.focus();
  }

  function openDayReview(day) {
    if (!state.dobStr) {
      if (openSettingsDialog) openSettingsDialog();
      return;
    }
    setReviewMode("day", day);
    openDialog(reviewDialog);
    renderReview();
  }

  if (openReview) openReview.addEventListener("click", openReviewDialog);
  if (asideReviewBtn) asideReviewBtn.addEventListener("click", openReviewDialog);

  if (closeReview) {
    closeReview.addEventListener("click", () => {
      setReviewMode("list");
      closeDialog(reviewDialog, openReview);
    });
  }
  if (reviewDialog) {
    reviewDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      setReviewMode("list");
      closeDialog(reviewDialog, openReview);
    });
  }

  if (reviewQuery) reviewQuery.addEventListener("input", renderReview);
  reviewScopeRadios.forEach((r) => r.addEventListener("change", renderReview));
  if (reviewFilterDaily) reviewFilterDaily.addEventListener("change", renderReview);
  if (reviewFilterExtra) reviewFilterExtra.addEventListener("change", renderReview);
  if (reviewFilterCycle) reviewFilterCycle.addEventListener("change", renderReview);
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

  return { renderReview, openReviewDialog, openDayReview };
}
