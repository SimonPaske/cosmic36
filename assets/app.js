// Cosmic 36 — app.js
// Keep this file pure JS. No HTML inside.

document.addEventListener("DOMContentLoaded", () => {
    const CYCLE_DAYS = 36;
    const ANCHORS = new Set([3, 6, 9, 12, 15, 18]);
    const ECHOES = new Set([21, 24, 27, 30, 33, 36]);

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

    const SETTINGS_KEY = "cosmic36_settings_v2";
    const STORE_KEY = "cosmic36_data_v2";

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

    function notePromptFor(day) {
        const t = getDayType(day);
        if (day === 1) return "What are you declaring today?";
        if (day === 2) return "How will you make this repetition effortless?";
        if (t === "anchor") return "What action did you take today?";
        if (t === "echo") return "What returned today?";
        return "What did you notice today?";
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
        savingTimer: null
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

    function openSettingsDialog() {
        if (openSettings) openSettings.setAttribute("aria-expanded", "true");
        if (settingsDialog && typeof settingsDialog.showModal === "function") {
            settingsDialog.showModal();
        } else if (settingsDialog) {
            settingsDialog.setAttribute("open", "");
        }
        if (dobInput) dobInput.focus();
    }

    function closeSettingsDialog() {
        if (openSettings) openSettings.setAttribute("aria-expanded", "false");
        if (settingsDialog && typeof settingsDialog.close === "function") {
            settingsDialog.close();
        } else if (settingsDialog) {
            settingsDialog.removeAttribute("open");
        }
        if (openSettings) openSettings.focus();
    }

    function render() {
        applyLayout();

        const info = compute();
        if (!info) {
            if (headerTitle) headerTitle.textContent = "Day — / 36";
            if (headerPhase) headerPhase.textContent = "Open Settings and enter your date of birth.";
            if (chipRow) chipRow.innerHTML = "";
            if (bigDay) bigDay.innerHTML = `Day — <small>/ 36</small>`;
            if (guidanceLine) guidanceLine.textContent = "—";
            if (hintLine) hintLine.textContent = "—";
            if (insightBox) insightBox.hidden = true;
            if (notePrompt) notePrompt.textContent = "Note";
            if (noteBox) noteBox.value = "";
            setDoneUI(false);
            setCardType("light");
            if (subLine) subLine.textContent = "One screen. One day. One note.";
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

        if (headerTitle) headerTitle.textContent = `Day ${state.dayInCycle} / 36`;
        if (headerPhase) headerPhase.textContent = `${phase.name} • ${phase.desc}`;
        if (bigDay) bigDay.innerHTML = `Day ${state.dayInCycle} <small>/ 36</small>`;
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

        if (notePrompt) notePrompt.textContent = notePromptFor(state.dayInCycle);
        if (noteBox) {
            const existing = state.cycle.notes[String(state.dayInCycle)] || "";
            if (document.activeElement !== noteBox && noteBox.value !== existing) noteBox.value = existing;
        }

        const done = !!state.cycle.done[String(state.dayInCycle)];
        setDoneUI(done);

        renderAside();
    }

    function syncSettingsUI() {
        if (dobInput) dobInput.value = state.dobStr || "";
        modeRadios.forEach(r => r.checked = (r.value === state.mode));
        if (densitySelect) densitySelect.value = state.density;
        gentleRadios.forEach(r => r.checked = (r.value === (state.gentle ? "on" : "off")));
    }

    // Events
    if (layoutBtn) {
        layoutBtn.addEventListener("click", () => {
            state.layout = (state.layout === "desktop") ? "mobile" : "desktop";
            persistSettings();
            render();
            showToast(state.layout === "desktop" ? "Desktop view" : "Mobile view");
        });
    }

    if (statusBtn) {
        statusBtn.addEventListener("click", () => {
            if (!state.cycle) return;
            const done = !!state.cycle.done[String(state.dayInCycle)];
            done ? unmarkDone() : markDone();
        });
    }

    if (noteBox) {
        noteBox.addEventListener("input", scheduleAutosave);
        noteBox.addEventListener("blur", saveNow);
    }

    if (clearNoteBtn) {
        clearNoteBtn.addEventListener("click", () => {
            if (!noteBox) return;
            if (!confirm("Clear the note for today?")) return;
            noteBox.value = "";
            saveNow();
            showToast("Cleared note");
        });
    }

    if (openSettings) openSettings.addEventListener("click", openSettingsDialog);
    if (closeSettings) closeSettings.addEventListener("click", closeSettingsDialog);

    if (settingsDialog) {
        settingsDialog.addEventListener("cancel", (e) => {
            e.preventDefault();
            closeSettingsDialog();
        });
    }

    if (dobInput) {
        dobInput.addEventListener("change", () => {
            const v = dobInput.value;
            if (!v) return;
            state.dobStr = v;
            persistSettings();
            render();
        });
    }

    modeRadios.forEach(r => r.addEventListener("change", () => {
        if (!r.checked) return;
        state.mode = r.value;
        persistSettings();
        render();
    }));

    if (densitySelect) {
        densitySelect.addEventListener("change", () => {
            state.density = densitySelect.value;
            persistSettings();
            render();
        });
    }

    gentleRadios.forEach(r => r.addEventListener("change", () => {
        if (!r.checked) return;
        state.gentle = (r.value === "on");
        persistSettings();
        render();
    }));

    if (clearCycleBtn) {
        clearCycleBtn.addEventListener("click", () => {
            const info = compute();
            if (!info) return alert("Set your DOB first.");
            const k = cycleKey(state.dobStr, state.mode, info.cycleIndex);
            if (!confirm("Clear notes + marks for the current cycle on this device?")) return;
            delete store[k];
            saveJSON(STORE_KEY, store);
            render();
            showToast("Cleared");
        });
    }

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
        if (!state.dobStr) openSettingsDialog();
    }

    init();
});