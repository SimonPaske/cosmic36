document.addEventListener("DOMContentLoaded", () => {
    const CYCLE_DAYS = 36;
    const ANCHORS = new Set([3, 6, 9, 12, 15, 18]);
    const ECHOES = new Set([21, 24, 27, 30, 33, 36]);

    // Guidance: your pattern-day guidance
    const GUIDANCE = {
        1: "Declare what you want, clearly and simply.",
        2: "Make your repetition effortless and automatic.",
        3: "Repeat the declaration and take one aligned action.",
        4: "Stay steady. No extra pressure needed.",
        5: "Notice resistance. Stay gentle. Continue.",
        6: "Repeat and add one clean layer of action.",
        7: "Hold the vision without demanding proof.",
        8: "Choose alignment over mood.",
        9: "Complete the triad with a third aligned action.",
        10: "Simplify. Repeat the basics.",
        11: "Let the body lead. Keep it calm.",
        12: "Repeat Day 3 exactly—no edits.",
        13: "Consistency is the spell.",
        14: "Stay honest. Stay simple.",
        15: "Repeat Day 6. Embody the layer.",
        16: "Steady beats intense.",
        17: "Return. Repeat. Release doubt.",
        18: "Repeat the full stack and feel the shift.",
        19: "Keep repeating—watch what responds.",
        20: "Stay open. Receive without chasing.",
        21: "Echo of Day 3: notice what returns.",
        22: "Observe patterns without judgment.",
        23: "Don’t rush outcomes. Repeat.",
        24: "Echo of Day 6: notice the response.",
        25: "Keep it small and real.",
        26: "Let the field speak. Write what you see.",
        27: "Echo of Day 9: what amplifies?",
        28: "Receive what’s here.",
        29: "Trust timing. Repeat.",
        30: "Echo of Day 12: stability or drift?",
        31: "Return to simplicity.",
        32: "Presence is power.",
        33: "Echo of Day 15: what’s undeniable now?",
        34: "Let it land. Rest.",
        35: "Give thanks and stay aligned.",
        36: "Repeat once more, then choose what you carry forward."
    };

    // Spiritual insights: authored inside the app (offline, yours)
    // Selection is deterministic, not “random”.
    const INSIGHTS = [
        "Repetition is how attention becomes devotion — and devotion becomes a stable inner field.",
        "A ritual is a container for the nervous system: it creates safety through predictability.",
        "Breath awareness is the oldest meditation technology — always available, always honest.",
        "Gratitude shifts perception first, and behavior follows perception.",
        "The body learns through consistency, not intensity.",
        "Noticing is already transformation. Awareness is action.",
        "In Zen: 'chop wood, carry water' — awakening lives inside ordinary acts.",
        "Compassion is discipline: speak to yourself like someone you love.",
        "Surrender is not giving up — it’s releasing control of timing.",
        "Tension and ease are information. The body is a quiet oracle."
    ];

    // Storage
    const SETTINGS_KEY = "cosmic36_settings_v3";
    const STORE_KEY = "cosmic36_data_v3";

    const $ = (id) => document.getElementById(id);

    // UI
    const subLine = $("subLine");
    const headerTitle = $("headerTitle");
    const headerPhase = $("headerPhase");
    const chipRow = $("chipRow");

    const todayCard = $("todayCard");
    const bigDay = $("bigDay");
    const guidanceLine = $("guidanceLine");
    const hintLine = $("hintLine");

    const insightBox = $("insightBox");
    const insightLine = $("insightLine");

    const statusBtn = $("statusBtn");
    const stateDot = $("stateDot");
    const statusText = $("statusText");

    const notePrompt = $("notePrompt");
    const noteBox = $("noteBox");
    const insertTemplateBtn = $("insertTemplateBtn");
    const clearNoteBtn = $("clearNoteBtn");
    const saveStatus = $("saveStatus");
    const saveText = $("saveText");

    const layoutBtn = $("layoutBtn");
    const lifeAside = $("lifeAside");
    const asideText = $("asideText");
    const kv = $("kv");
    const swipeHint = $("swipeHint");

    const settingsDialog = $("settingsDialog");
    const openSettings = $("openSettings");
    const closeSettings = $("closeSettings");
    const dobInput = $("dob");
    const modeRadios = [...document.querySelectorAll('input[name="mode"]')];
    const densitySelect = $("density");
    const gentleRadios = [...document.querySelectorAll('input[name="gentle"]')];
    const clearCycleBtn = $("clearCycleBtn");

    // Review UI
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
    const exportNotesBtn = $("exportNotesBtn");
    const exportDoneBtn = $("exportDoneBtn");

    const toast = $("toast");
    const yearNow = $("yearNow");
    if (yearNow) yearNow.textContent = String(new Date().getFullYear());

    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 900);
    }

    function loadJSON(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
        catch { return fallback; }
    }
    function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

    function toUtcDayNumber(d) {
        return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    }
    function toLocalDayNumber(d) {
        const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return Math.floor(localMidnight.getTime() / 86400000);
    }
    function dayNumber(d, mode) { return mode === "local" ? toLocalDayNumber(d) : toUtcDayNumber(d); }

    function parseDob(value) {
        if (!value) return null;
        const [y, m, dd] = value.split("-").map(Number);
        if (!y || !m || !dd) return null;
        return new Date(y, m - 1, dd);
    }

    function getDayType(day) {
        if (ANCHORS.has(day)) return "anchor";
        if (ECHOES.has(day)) return "echo";
        return "light";
    }

    function getPhase(day) {
        return day <= 18
            ? { name: "Phase 1: Sending", desc: "Imprint through repetition. Pressure days carry the charge." }
            : { name: "Phase 2: Receiving", desc: "Repeat and observe what returns. Let life respond." };
    }

    // Mindful prompts (more helpful than generic notes)
    function mindfulPrompt(day) {
        const t = getDayType(day);
        if (day === 1) return "Declaration — write it in one clear sentence.";
        if (day === 2) return "Make it easy — what will you repeat daily without force?";
        if (t === "anchor") return "Anchor day — what action did you take and how did it feel in your body?";
        if (t === "echo") return "Echo day — what returned, and what might it be teaching you?";
        return "Light day — what did you do, notice, and carry forward?";
    }

    function mindfulTemplate(day) {
        const t = getDayType(day);
        if (day === 1) {
            return "Declaration (one sentence):\n\nToday I repeat by:\n\nOne small aligned action:\n";
        }
        if (day === 2) {
            return "Effortless repetition:\n\nWhat makes this easy today:\n\nMinimum version I will do no matter what:\n";
        }
        if (t === "anchor") {
            return "Action taken today:\n\nBody signal (tension/ease/energy):\n\nOne thing I’ll keep repeating:\n";
        }
        if (t === "echo") {
            return "What returned today:\n\nWhat it might be showing me:\n\nMy response (one clean choice):\n";
        }
        return "What I did (one line):\n\nWhat I noticed (one line):\n\nWhat I carry forward (one line):\n";
    }

    function nextSpecialDay(fromDay, set) {
        for (let i = 0; i < 36; i++) {
            const d = ((fromDay - 1 + i) % 36) + 1;
            if (set.has(d)) return { day: d, inDays: i };
        }
        return null;
    }

    function cycleIndexFromDaysLived(daysLived) {
        return Math.floor(daysLived / CYCLE_DAYS) + 1;
    }

    function cycleKey(dobStr, mode, cycleIndex) { return `${dobStr}|${mode}|cycle${cycleIndex}`; }

    function getCycle(store, dobStr, mode, cycleIndex) {
        const k = cycleKey(dobStr, mode, cycleIndex);
        return store[k] || { updatedAt: Date.now(), done: {}, notes: {} };
    }

    function putCycle(store, dobStr, mode, cycleIndex, cycle) {
        const k = cycleKey(dobStr, mode, cycleIndex);
        cycle.updatedAt = Date.now();
        store[k] = cycle;
        saveJSON(STORE_KEY, store);
    }

    let store = loadJSON(STORE_KEY, {});
    let settings = loadJSON(SETTINGS_KEY, {
        dobStr: "",
        mode: "utc",
        layout: "mobile",
        density: "minimal",
        gentle: true
    });

    let state = {
        dobStr: settings.dobStr || "",
        mode: settings.mode || "utc",
        layout: settings.layout || "mobile",
        density: settings.density || "minimal",
        gentle: settings.gentle !== false,
        dayInCycle: null,
        cycleIndex: null,
        cycleStartYMD: "",
        daysLived: 0,
        hoursLived: 0,
        cycle: null,
        savingTimer: null,

        // review state
        selectedReviewDay: null,
        reviewAutosaveTimer: null
    };

    function persistSettings() {
        saveJSON(SETTINGS_KEY, {
            dobStr: state.dobStr,
            mode: state.mode,
            layout: state.layout,
            density: state.density,
            gentle: state.gentle
        });
    }

    function setSaveIndicator(kind) {
        if (!saveStatus || !saveText) return;
        if (kind === "saving") {
            saveStatus.classList.remove("ok");
            saveText.textContent = "Saving…";
        } else if (kind === "saved") {
            saveStatus.classList.add("ok");
            saveText.textContent = "Saved ✓";
            setTimeout(() => {
                saveStatus.classList.remove("ok");
                saveText.textContent = "Autosave enabled";
            }, 1100);
        } else {
            saveStatus.classList.remove("ok");
            saveText.textContent = "Autosave enabled";
        }
    }

    function setDoneUI(done) {
        if (!stateDot || !statusBtn || !statusText) return;
        stateDot.classList.toggle("done", done);
        statusBtn.setAttribute("aria-pressed", String(done));
        statusText.textContent = state.gentle
            ? (done ? "Marked ✓" : "Not marked")
            : (done ? "Done ✓" : "Not done");
    }

    function setCardType(type) {
        if (!todayCard) return;
        todayCard.classList.remove("light", "anchor", "echo");
        todayCard.classList.add(type);
    }

    function applyLayout() {
        document.documentElement.dataset.layout = state.layout;
        if (layoutBtn) layoutBtn.textContent = (state.layout === "desktop") ? "Mobile view" : "Desktop view";
        const isDesktop = state.layout === "desktop";
        if (lifeAside) lifeAside.hidden = !isDesktop;
        if (swipeHint) swipeHint.style.display = isDesktop ? "none" : "flex";
    }

    function renderAside() {
        if (state.layout !== "desktop") return;
        if (!asideText || !kv) return;

        const doneCount = Object.values(state.cycle?.done || {}).filter(Boolean).length;
        asideText.textContent = "Perspective metrics (not pressure).";
        kv.innerHTML = `
      <div class="row"><span>Total days on Earth</span><b>${state.daysLived.toLocaleString()}</b></div>
      <div class="row"><span>Total hours</span><b>${state.hoursLived.toLocaleString()}</b></div>
      <div class="row"><span>Marked this cycle</span><b>${doneCount} / 36</b></div>
      <div class="row"><span>Cycle started</span><b>${state.cycleStartYMD}</b></div>
    `;
    }

    function compute() {
        const dob = parseDob(state.dobStr);
        if (!dob) return null;

        const now = new Date();
        const dobDay = dayNumber(dob, state.mode);
        const todayDay = dayNumber(now, state.mode);
        if (todayDay < dobDay) return null;

        const daysLived = todayDay - dobDay;
        const dayInCycle = (daysLived % CYCLE_DAYS) + 1;
        const cycleIndex = cycleIndexFromDaysLived(daysLived);
        const hoursLived = Math.floor((now.getTime() - dob.getTime()) / 3600000);

        const cycleStartOffset = daysLived - (daysLived % CYCLE_DAYS);
        const cycleStart = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
        cycleStart.setDate(cycleStart.getDate() + cycleStartOffset);

        return {
            daysLived,
            hoursLived,
            dayInCycle,
            cycleIndex,
            cycleStartYMD: cycleStart.toISOString().slice(0, 10)
        };
    }

    function persistCycle() {
        if (!state.cycle || !state.dobStr) return;
        putCycle(store, state.dobStr, state.mode, state.cycleIndex, state.cycle);
    }

    function markDone() {
        state.cycle.done[String(state.dayInCycle)] = true;
        persistCycle();
        setDoneUI(true);
        showToast("Marked ✓");
    }

    function unmarkDone() {
        state.cycle.done[String(state.dayInCycle)] = false;
        persistCycle();
        setDoneUI(false);
        showToast("Unmarked");
    }

    function scheduleAutosave() {
        if (!state.cycle || !noteBox) return;
        if (state.savingTimer) clearTimeout(state.savingTimer);
        setSaveIndicator("saving");
        state.savingTimer = setTimeout(() => {
            state.cycle.notes[String(state.dayInCycle)] = noteBox.value || "";
            persistCycle();
            setSaveIndicator("saved");
        }, 650);
    }

    function saveNow() {
        if (!state.cycle || !noteBox) return;
        state.cycle.notes[String(state.dayInCycle)] = noteBox.value || "";
        persistCycle();
        setSaveIndicator("saved");
    }

    function openDialog(dialogEl, openerBtn) {
        if (openerBtn) openerBtn.setAttribute("aria-expanded", "true");
        if (dialogEl && typeof dialogEl.showModal === "function") dialogEl.showModal();
        else if (dialogEl) dialogEl.setAttribute("open", "");
    }

    function closeDialog(dialogEl, openerBtn) {
        if (openerBtn) openerBtn.setAttribute("aria-expanded", "false");
        if (dialogEl && typeof dialogEl.close === "function") dialogEl.close();
        else if (dialogEl) dialogEl.removeAttribute("open");
        if (openerBtn) openerBtn.focus();
    }

    // -------- REVIEW --------
    function getReviewScope() {
        const checked = reviewScopeRadios.find(r => r.checked);
        return checked ? checked.value : "cycle";
    }

    function buildReviewItems() {
        if (!state.dobStr) return [];
        const q = (reviewQuery?.value || "").trim().toLowerCase();
        const scope = getReviewScope();

        const items = [];
        const cycleOnlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);

        for (const [k, cycle] of Object.entries(store)) {
            if (!k.startsWith(`${state.dobStr}|${state.mode}|cycle`)) continue;
            if (scope === "cycle" && k !== cycleOnlyKey) continue;

            const match = k.match(/cycle(\d+)$/);
            const cycleIndex = match ? Number(match[1]) : null;

            for (const [dayStr, note] of Object.entries(cycle.notes || {})) {
                const day = Number(dayStr);
                const text = String(note || "").trim();
                if (!text) continue;

                const type = getDayType(day);
                const preview = text.replace(/\s+/g, " ").slice(0, 90);
                const hay = (preview + " " + text).toLowerCase();

                if (q && !hay.includes(q)) continue;

                items.push({
                    cycleIndex,
                    day,
                    type,
                    preview,
                    full: text,
                    storeKey: k
                });
            }
        }

        // sort newest cycle first, then day desc
        items.sort((a, b) => (b.cycleIndex - a.cycleIndex) || (b.day - a.day));
        return items;
    }

    function renderReview() {
        if (!noteList) return;

        const items = buildReviewItems();
        if (!items.length) {
            noteList.innerHTML = `<div class="noteItem"><div class="noteMeta"><b>No notes found</b><span>Write a note today, then review it here.</span></div><span class="badge light">—</span></div>`;
            if (reviewEditorWrap) reviewEditorWrap.hidden = true;
            state.selectedReviewDay = null;
            return;
        }

        noteList.innerHTML = items.map((it, idx) => {
            const badge = it.type;
            const label = `${badge.toUpperCase()} • C${it.cycleIndex} D${it.day}`;
            return `
        <div class="noteItem" data-idx="${idx}">
          <div class="noteMeta">
            <b>${label}</b>
            <span>${escapeHtml(it.preview)}${it.full.length > it.preview.length ? "…" : ""}</span>
          </div>
          <span class="badge ${badge}">${badge}</span>
        </div>
      `;
        }).join("");

        // click to edit
        noteList.querySelectorAll(".noteItem").forEach(el => {
            el.addEventListener("click", () => {
                const idx = Number(el.getAttribute("data-idx"));
                const it = items[idx];
                openReviewEditor(it);
            });
        });
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function openReviewEditor(item) {
        state.selectedReviewDay = item;
        if (!reviewEditorWrap || !reviewEditor) return;
        reviewEditorWrap.hidden = false;
        reviewEditor.value = item.full || "";
        if (reviewSaveText) reviewSaveText.textContent = "Autosave enabled";
        setTimeout(() => reviewEditor.focus(), 0);
    }

    function scheduleReviewAutosave() {
        if (!state.selectedReviewDay || !reviewEditor) return;
        if (state.reviewAutosaveTimer) clearTimeout(state.reviewAutosaveTimer);
        if (reviewSaveText) reviewSaveText.textContent = "Saving…";
        state.reviewAutosaveTimer = setTimeout(() => {
            const { storeKey, day } = state.selectedReviewDay;
            const cycle = store[storeKey];
            if (!cycle) return;

            cycle.notes[String(day)] = reviewEditor.value || "";
            cycle.updatedAt = Date.now();
            store[storeKey] = cycle;
            saveJSON(STORE_KEY, store);

            if (reviewSaveText) reviewSaveText.textContent = "Saved ✓";
            setTimeout(() => { if (reviewSaveText) reviewSaveText.textContent = "Autosave enabled"; }, 1000);

            // keep today view in sync if editing current cycle/day
            render();
            renderReview();
        }, 650);
    }

    function exportJSON(filename, payload) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function exportNotes() {
        if (!state.dobStr) return alert("Set your DOB first.");
        const items = buildReviewItems().map(i => ({
            cycle: i.cycleIndex,
            day: i.day,
            type: i.type,
            note: i.full
        }));
        exportJSON(`cosmic36-notes-${new Date().toISOString().slice(0, 10)}.json`, {
            exportedAt: new Date().toISOString(),
            dob: state.dobStr,
            mode: state.mode,
            scope: getReviewScope(),
            notes: items
        });
        showToast("Exported notes");
    }

    function exportDone() {
        if (!state.dobStr) return alert("Set your DOB first.");
        const scope = getReviewScope();
        const cycleOnlyKey = cycleKey(state.dobStr, state.mode, state.cycleIndex);

        const out = [];
        for (const [k, cycle] of Object.entries(store)) {
            if (!k.startsWith(`${state.dobStr}|${state.mode}|cycle`)) continue;
            if (scope === "cycle" && k !== cycleOnlyKey) continue;

            const match = k.match(/cycle(\d+)$/);
            const cycleIndex = match ? Number(match[1]) : null;

            for (const [dayStr, val] of Object.entries(cycle.done || {})) {
                if (val) out.push({ cycle: cycleIndex, day: Number(dayStr) });
            }
        }

        exportJSON(`cosmic36-marks-${new Date().toISOString().slice(0, 10)}.json`, {
            exportedAt: new Date().toISOString(),
            dob: state.dobStr,
            mode: state.mode,
            scope,
            marks: out
        });
        showToast("Exported marks");
    }

    // -------- MAIN RENDER --------
    function render() {
        applyLayout();

        const info = compute();
        if (!info) {
            headerTitle && (headerTitle.textContent = "Day — / 36");
            headerPhase && (headerPhase.textContent = "Open Settings and enter your date of birth.");
            chipRow && (chipRow.innerHTML = "");
            bigDay && (bigDay.innerHTML = `Day — <small>/ 36</small>`);
            guidanceLine && (guidanceLine.textContent = "—");
            hintLine && (hintLine.textContent = "—");
            insightBox && (insightBox.hidden = true);
            notePrompt && (notePrompt.textContent = "Mindful note");
            noteBox && (noteBox.value = "");
            setDoneUI(false);
            setCardType("light");
            subLine && (subLine.textContent = "One screen. One day. One note.");
            return;
        }

        state.daysLived = info.daysLived;
        state.hoursLived = info.hoursLived;
        state.dayInCycle = info.dayInCycle;
        state.cycleIndex = info.cycleIndex;
        state.cycleStartYMD = info.cycleStartYMD;

        state.cycle = getCycle(store, state.dobStr, state.mode, state.cycleIndex);

        const t = getDayType(state.dayInCycle);
        const phase = getPhase(state.dayInCycle);

        headerTitle && (headerTitle.textContent = `Day ${state.dayInCycle} / 36`);
        headerPhase && (headerPhase.textContent = `${phase.name} • ${phase.desc}`);
        bigDay && (bigDay.innerHTML = `Day ${state.dayInCycle} <small>/ 36</small>`);
        setCardType(t);

        const nextA = nextSpecialDay(state.dayInCycle, ANCHORS);
        const nextE = nextSpecialDay(state.dayInCycle, ECHOES);

        if (chipRow) {
            chipRow.innerHTML = [
                `<span class="chip"><span class="dot ${t}"></span> ${t === "light" ? "Light" : (t === "anchor" ? "Anchor" : "Echo")} day</span>`,
                `<span class="chip">Days on Earth: ${state.daysLived.toLocaleString()}</span>`,
                `<span class="chip">Hours: ${state.hoursLived.toLocaleString()}</span>`,
                nextA ? `<span class="chip"><span class="dot anchor"></span> Next anchor: Day ${nextA.day} (in ${nextA.inDays}d)</span>` : "",
                nextE ? `<span class="chip"><span class="dot echo"></span> Next echo: Day ${nextE.day} (in ${nextE.inDays}d)</span>` : ""
            ].filter(Boolean).join("");
        }

        const showGuidance = state.density !== "silent";
        const showHint = state.density === "supportive";

        if (guidanceLine) {
            guidanceLine.style.display = showGuidance ? "block" : "none";
            if (showGuidance) guidanceLine.textContent = GUIDANCE[state.dayInCycle] || "Stay with the rhythm.";
        }
        if (hintLine) {
            hintLine.style.display = showHint ? "block" : "none";
            if (showHint) {
                hintLine.textContent = (t === "anchor")
                    ? "Pressure day: keep it clean and exact."
                    : (t === "echo")
                        ? "Mirror day: repeat and observe what returns."
                        : "Light day: do the small repetition and breathe.";
            }
        }

        if (insightBox && insightLine) {
            if (showGuidance) {
                insightBox.hidden = false;
                const idx = (state.dayInCycle + state.daysLived) % INSIGHTS.length;
                insightLine.textContent = INSIGHTS[idx];
            } else {
                insightBox.hidden = true;
            }
        }

        if (notePrompt) notePrompt.textContent = mindfulPrompt(state.dayInCycle);

        if (noteBox) {
            const existing = state.cycle.notes[String(state.dayInCycle)] || "";
            if (document.activeElement !== noteBox && noteBox.value !== existing) noteBox.value = existing;
            noteBox.placeholder = mindfulTemplate(state.dayInCycle).split("\n").slice(0, 3).join("\n");
        }

        const done = !!state.cycle.done[String(state.dayInCycle)];
        setDoneUI(done);

        renderAside();
    }

    function syncSettingsUI() {
        dobInput && (dobInput.value = state.dobStr || "");
        modeRadios.forEach(r => r.checked = (r.value === state.mode));
        densitySelect && (densitySelect.value = state.density);
        gentleRadios.forEach(r => r.checked = (r.value === (state.gentle ? "on" : "off")));
    }

    // ---------- Events ----------
    layoutBtn && layoutBtn.addEventListener("click", () => {
        state.layout = (state.layout === "desktop") ? "mobile" : "desktop";
        persistSettings();
        render();
        showToast(state.layout === "desktop" ? "Desktop view" : "Mobile view");
    });

    statusBtn && statusBtn.addEventListener("click", () => {
        if (!state.cycle) return;
        const done = !!state.cycle.done[String(state.dayInCycle)];
        done ? unmarkDone() : markDone();
    });

    noteBox && noteBox.addEventListener("input", scheduleAutosave);
    noteBox && noteBox.addEventListener("blur", saveNow);

    insertTemplateBtn && insertTemplateBtn.addEventListener("click", () => {
        if (!noteBox) return;
        if (noteBox.value.trim()) {
            if (!confirm("Replace your current note with a mindful template?")) return;
        }
        noteBox.value = mindfulTemplate(state.dayInCycle);
        scheduleAutosave();
        noteBox.focus();
    });

    clearNoteBtn && clearNoteBtn.addEventListener("click", () => {
        if (!noteBox) return;
        if (!confirm("Clear the note for today?")) return;
        noteBox.value = "";
        saveNow();
        showToast("Cleared");
    });

    openSettings && openSettings.addEventListener("click", () => openDialog(settingsDialog, openSettings));
    closeSettings && closeSettings.addEventListener("click", () => closeDialog(settingsDialog, openSettings));
    settingsDialog && settingsDialog.addEventListener("cancel", (e) => { e.preventDefault(); closeDialog(settingsDialog, openSettings); });

    dobInput && dobInput.addEventListener("change", () => {
        const v = dobInput.value;
        if (!v) return;
        state.dobStr = v;
        persistSettings();
        render();
    });

    modeRadios.forEach(r => r.addEventListener("change", () => {
        if (!r.checked) return;
        state.mode = r.value;
        persistSettings();
        render();
    }));

    densitySelect && densitySelect.addEventListener("change", () => {
        state.density = densitySelect.value;
        persistSettings();
        render();
    });

    gentleRadios.forEach(r => r.addEventListener("change", () => {
        if (!r.checked) return;
        state.gentle = (r.value === "on");
        persistSettings();
        render();
    }));

    clearCycleBtn && clearCycleBtn.addEventListener("click", () => {
        const info = compute();
        if (!info) return alert("Set your DOB first.");
        const k = cycleKey(state.dobStr, state.mode, info.cycleIndex);
        if (!confirm("Clear notes + marks for the current cycle on this device?")) return;
        delete store[k];
        saveJSON(STORE_KEY, store);
        render();
        showToast("Cleared");
    });

    // Review open/close
    openReview && openReview.addEventListener("click", () => {
        if (!state.dobStr) { openDialog(settingsDialog, openSettings); return; }
        openDialog(reviewDialog, openReview);
        renderReview();
        reviewQuery && reviewQuery.focus();
    });

    closeReview && closeReview.addEventListener("click", () => closeDialog(reviewDialog, openReview));
    reviewDialog && reviewDialog.addEventListener("cancel", (e) => { e.preventDefault(); closeDialog(reviewDialog, openReview); });

    reviewQuery && reviewQuery.addEventListener("input", renderReview);
    reviewScopeRadios.forEach(r => r.addEventListener("change", renderReview));

    reviewEditor && reviewEditor.addEventListener("input", scheduleReviewAutosave);

    jumpToTodayBtn && jumpToTodayBtn.addEventListener("click", () => {
        closeDialog(reviewDialog, openReview);
        noteBox && noteBox.focus();
    });

    exportNotesBtn && exportNotesBtn.addEventListener("click", exportNotes);
    exportDoneBtn && exportDoneBtn.addEventListener("click", exportDone);

    // Swipe gestures (mobile only)
    let touch = { startX: 0, startY: 0 };
    const SWIPE_X = 55;
    const SWIPE_Y = 80;

    if (todayCard) {
        todayCard.addEventListener("touchstart", (e) => {
            const t = e.touches[0];
            touch.startX = t.clientX;
            touch.startY = t.clientY;
        }, { passive: true });

        todayCard.addEventListener("touchmove", (e) => {
            const t = e.touches[0];
            const dx = t.clientX - touch.startX;
            const dy = t.clientY - touch.startY;
            if (Math.abs(dx) > 12 && Math.abs(dy) < 20) e.preventDefault();
        }, { passive: false });

        todayCard.addEventListener("touchend", (e) => {
            if (state.layout === "desktop") return;
            if (!state.cycle) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - touch.startX;
            const dy = t.clientY - touch.startY;
            if (Math.abs(dy) > SWIPE_Y) return;
            if (dx > SWIPE_X) markDone();
            else if (dx < -SWIPE_X) unmarkDone();
        }, { passive: true });
    }

    // Init
    function init() {
        const params = new URLSearchParams(location.search);
        const dobFromUrl = params.get("dob");
        if (dobFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dobFromUrl)) state.dobStr = dobFromUrl;

        syncSettingsUI();
        render();
        if (!state.dobStr) openDialog(settingsDialog, openSettings);
    }

    init();
});