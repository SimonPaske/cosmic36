# Cosmic 36 — README

Cosmic 36 is a lightweight daily companion that helps you **track a repeating 36-day cycle**, write one note per day, and review what you’ve learned over time.  
It’s designed to be fast: **one screen, one day, one entry** — with optional “complete” writing sections when you want deeper journaling.

---

## What the app is for

- **Consistency:** build a daily rhythm you can actually keep.
- **Awareness:** notice patterns across a 36-day cycle (what repeats, what shifts, what returns).
- **Tracking:** mark days you completed your practice, and keep notes tied to each day number.
- **Reflection:** review your notes by cycle or across all time, and export them as text.

This app is **not a medical tool** and does not replace professional advice. It’s a journaling + pattern-tracking tool.

---

## Quick start

1. Open **Settings**.
2. Set your **Date of birth** (DOB).
3. Choose your **Day boundary mode** (UTC-safe is recommended).
4. Pick your **Guidance density** and **Experience** (compact or complete).
5. Return to Today, write your note, and optionally **mark** the day.

---

## Core idea: Day 1 to Day 36

After you set your DOB, the app counts how many days have passed and maps today to a number:

- **Day 1 → Day 36**
- After Day 36, the cycle restarts at **Day 1** again.

You’ll always see:

- Your **current day in the cycle**
- A **hint/guidance line** (depending on density)
- Your daily **note field**
- A **Review notes** dialog where you can search/edit/export

---

## “Day 1” and “Day 18” (Pattern start days)

The app highlights **Day 1** and **Day 18** as pattern start windows:

- **Day 1:** cycle opening — best for making a clear declaration or intention.
- **Day 18:** midpoint reset — best for recommitting or adjusting direction.

These are treated as “start points” because they help you begin with clean structure:

- Day 1 = beginning signal
- Day 18 = mid-cycle reboot

### The ⓘ info icon

The ⓘ button explains:

- why Day 1 and Day 18 matter
- what the app is meant to do
- what happens if you skip crucial start days

---

## Daily “Mark” (status)

On the Today card you can mark the day:

- **Swipe right** (mobile): mark
- **Swipe left** (mobile): unmark
- Tap the status button: mark (unmark is swipe-left)

### Gentle continuity (Settings option)

This changes the language only (not your data):

- **On:** unmarked days show as “Not marked” (gentler tone)
- **Off:** unmarked days show as “Not done” (more direct tone)

---

## Review notes

The **Review notes** button opens a dialog where you can:

- Search notes by text
- Switch scope:
  - **This cycle** = only notes from the current 36-day cycle
  - **All time** = notes across all saved cycles
- Click a note to edit it
- Export notes to TXT (depending on which export buttons you’ve enabled)

### Export options (TXT)

Your implementation can support:

- **Export notes** (daily notes)
- **Export close notes** (cycle closing fields)
- **Export both** (one file containing both)

Export produces a plain `.txt` file so you can paste it into Notion, Google Docs, email, etc.

---

## Writing modes: Compact vs Complete (Experience)

In **Settings → Experience**:

### Compact

Shows only:

- Today guidance + hint
- One note box

Best for quick daily use.

### Complete

Shows everything Compact shows, plus collapsible sections:

- **Intention (morning)** — what you plan to repeat and observe
- **Reflection (evening)** — what returned and what it meant
- **Close the cycle** — end-of-cycle integration fields

If you choose “Complete” and you don’t see extra sections, ensure:

- your app.js is applying `data-experience="complete"` to `<html>`
- `extrasWrap` is not forced `hidden` in your HTML
- your CSS isn’t accidentally hiding the section

---

## Guidance density (Minimal / Supportive / Silent)

In **Settings → Guidance density**:

### Minimal

- Shows: **Guidance + Hint**
- Hides: **Spiritual insight**
  Best for clean, practical direction.

### Supportive

- Shows: **Guidance + Hint + Spiritual insight**
  Best for reflective + meaning-centered days.

### Silent

- Hides: **Guidance + Hint + Spiritual insight**
  Best when you want only the day number and your note.

---

## Day boundary mode (UTC-safe vs Local midnight)

This controls **when the app changes “today”**.

### UTC-safe (recommended)

- Uses UTC date boundaries
- More stable across travel, DST shifts, and timezone changes
  Best if you want the cycle to stay consistent across devices.

### Local midnight

- Uses your device’s local midnight
  Best if you want “today” to match your local calendar day exactly.

Tip: If you switch this later, the calculated “Day X” may change. That’s expected because the app is using a different definition of a “day.”

---

## Desktop view vs Mobile view

The **Desktop view** button changes layout:

### Mobile view

- One-column flow
- Swipe gestures available on the Today card

### Desktop view

- Two-column layout
- Today card can stay visible while you scroll
- May show an extra “Life on Earth” aside (if enabled)

---

## Close the cycle (Complete experience)

Near the end of a 36-day run, you can write:

- **What did this cycle teach me?**
- **What stays (carry forward)?**
- **What leaves (release)?**

These fields help you “close the loop” so the next cycle starts clean.

---

## Clearing data

### Clear current cycle data (Settings)

This wipes **only the current cycle** on this device:

- marks
- notes
- intention/reflection/close fields

It does not affect other saved cycles unless you clear those separately.

---

## Where your data is stored

All data is stored locally in your browser using **localStorage**:

- No account needed
- No cloud sync by default
- If you clear browser storage, notes can be lost

If you want backup, use **Export** regularly.

---

## Common troubleshooting

### “Nothing happens when I click the ⓘ button”

Check:

- Your HTML uses `<script type="module" src="./assets/app.js"></script>`
- You have `infoContent.js` in the same folder as `app.js`
- `patternInfoBtn` exists in the DOM and the ID matches

### “Complete mode looks the same as Compact”

Check:

- `extrasWrap` exists
- Your JS sets `state.experience` correctly
- `<html data-experience="complete">` is being applied
- CSS isn’t overriding `hidden` or display rules

### “My day number changed”

This can happen if:

- you changed **Day boundary mode**
- your system clock/timezone changed
- you switched devices with different date handling

---

## Suggested daily ritual (30 seconds)

1. Open the app.
2. Read the guidance line (or skip if silent).
3. Write **one honest sentence**.
4. Mark the day if you completed your intention.

That’s enough. The power comes from repetition.

---

## Version notes (optional section you can keep)

- v1: One note/day + mark
- v2: Review + export
- v3: Complete experience (Intention/Reflection/Close)
- v4: Tooltips + density modes + improved desktop layout

---
