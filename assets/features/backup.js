import { BACKUP_META_KEY, PRE_RESTORE_KEY, SETTINGS_KEY, STORE_KEY } from "../core/constants.js";
import { loadJSON, saveJSON } from "../core/store.js";
import { saveSettings } from "../settings/settings.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";
import { $ } from "../ui/dom.js";
import { openDialog, closeDialog } from "../ui/dialog.js";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const BACKUP_FILENAME = "cosmic36-backup.json";
const SNAPSHOT_RE = /^cosmic36-backup-(\d{4}-\d{2}-\d{2})\.json$/;
const SNAPSHOT_KEEP = 14;
const GOOGLE_CONNECTED_KEY = "cosmic36_google_connected_v1";
const GOOGLE_HINT_KEY = "cosmic36_google_hint_v1";
const AUTO_BACKUP_DELAY = 2000;
const AUTO_BACKUP_MIN_INTERVAL = 30000;
// Auto-backup refuses to overwrite Drive if the entry count drops below this
// fraction of the last backup (e.g. after "Clear current cycle data").
const SHRINK_RATIO = 0.5;
const SHRINK_MIN_ENTRIES = 5;

// ---------------------------------------------------------------------------
// Errors

class BackupError extends Error {
  /** kind: offline | network | auth | reauth | http | invalid | config */
  constructor(kind, message, status = 0) {
    super(message || kind);
    this.kind = kind;
    this.status = status;
  }
}

function describeError(error) {
  switch (error?.kind) {
    case "offline":
      return "You're offline. Backup will run when you're back online.";
    case "network":
      return "Couldn't reach Google Drive. Check your connection.";
    case "auth":
    case "reauth":
      return "Google sign-in is needed.";
    case "config":
      return error.message;
    case "invalid":
      return "That backup file isn't valid.";
    default:
      return error?.status ? `Google Drive error (${error.status}).` : "Something went wrong.";
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Local data helpers (no Google needed)

function getClientId() {
  const meta = document.querySelector('meta[name="google-client-id"]');
  const id = meta?.content?.trim() || "";
  return id.includes("YOUR_GOOGLE_CLIENT_ID") ? "" : id;
}

function getBackupMeta() {
  return loadJSON(BACKUP_META_KEY, {});
}

function setBackupMeta(next) {
  saveJSON(BACKUP_META_KEY, { ...getBackupMeta(), ...next });
}

function buildBackupPayload() {
  return {
    version: 1,
    app: "Cosmic 36",
    createdAt: new Date().toISOString(),
    settings: loadJSON(SETTINGS_KEY, {}),
    store: loadJSON(STORE_KEY, {})
  };
}

const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);

export function isValidBackup(payload) {
  if (!isPlainObject(payload) || !isPlainObject(payload.store) || !isPlainObject(payload.settings)) return false;
  if (payload.app && payload.app !== "Cosmic 36") return false;
  if (Number(payload.version) > 1) return false;
  return Object.values(payload.store).every(isPlainObject);
}

/** Number of non-empty written entries (notes, intention, reflection, close). */
export function countEntries(store) {
  let count = 0;
  const countMap = (map) => {
    if (!isPlainObject(map)) return;
    Object.values(map).forEach((v) => {
      if (typeof v === "string" && v.trim()) count += 1;
    });
  };
  Object.values(store || {}).forEach((cycle) => {
    if (!isPlainObject(cycle)) return;
    countMap(cycle.notes);
    countMap(cycle.intention);
    countMap(cycle.reflection);
    countMap(cycle.close);
  });
  return count;
}

/** Merge two cycles: newer wins per field, but never drop text the other side has. */
function mergeCycle(a, b) {
  const [newer, older] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
  const out = { ...older, ...newer };
  for (const field of ["notes", "intention", "reflection", "close"]) {
    const merged = { ...(older[field] || {}) };
    for (const [k, v] of Object.entries(newer[field] || {})) {
      if (typeof v !== "string" || v.trim() || !merged[k]) merged[k] = v;
    }
    out[field] = merged;
  }
  out.done = { ...(older.done || {}), ...(newer.done || {}) };
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}

export function mergeStores(local, remote) {
  const out = { ...remote };
  for (const [key, cycle] of Object.entries(local)) {
    out[key] = remote[key] ? mergeCycle(cycle, remote[key]) : cycle;
  }
  return out;
}

function savePreRestoreSnapshot() {
  saveJSON(PRE_RESTORE_KEY, {
    savedAt: new Date().toISOString(),
    settings: loadJSON(SETTINGS_KEY, {}),
    store: loadJSON(STORE_KEY, {})
  });
}

/**
 * Replace local data with a backup (after saving an undo snapshot) and reload,
 * so no module keeps writing its stale in-memory copy.
 */
function applyBackupAndReload(payload, { message = "Backup restored. Reloading…", meta = {} } = {}) {
  const localSettings = loadJSON(SETTINGS_KEY, {});
  savePreRestoreSnapshot();
  saveJSON(SETTINGS_KEY, {
    ...payload.settings,
    // Device-specific choices stay as they are on this device.
    autoBackupEnabled: localSettings.autoBackupEnabled ?? payload.settings.autoBackupEnabled,
    usageMs: Math.max(Number(localSettings.usageMs) || 0, Number(payload.settings.usageMs) || 0)
  });
  saveJSON(STORE_KEY, payload.store);
  setBackupMeta({ lastRestoreAt: new Date().toISOString(), lastEntryCount: countEntries(payload.store), ...meta });
  showToast(message, "success");
  window.setTimeout(() => window.location.reload(), 600);
}

function formatTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function localDateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Google Identity Services loader (lazy, keeps it off the critical path)

let gisPromise = null;

function isGisReady() {
  return !!window.google?.accounts?.oauth2;
}

function loadGis() {
  if (isGisReady()) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => (isGisReady() ? resolve() : reject(new BackupError("network", "gis_unavailable")));
    script.onerror = () => {
      gisPromise = null; // allow a retry later
      script.remove();
      reject(new BackupError(navigator.onLine === false ? "offline" : "network", "gis_load_failed"));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

// ---------------------------------------------------------------------------

export function initBackup(state) {
  const signInBtn = $("googleSignInBtn");
  const signOutBtn = $("googleSignOutBtn");
  const backupBtn = $("backupNowBtn");
  const restoreBtn = $("restoreNowBtn");
  const deleteBtn = $("deleteBackupBtn");
  const deleteDialog = $("deleteBackupDialog");
  const deleteConfirmBtn = $("deleteBackupConfirm");
  const deleteCancelBtn = $("deleteBackupCancel");
  const restoreDialog = $("restoreDialog");
  const restoreSelect = $("restoreVersionSelect");
  const restoreConfirmBtn = $("restoreConfirm");
  const restoreCancelBtn = $("restoreCancel");
  const undoRestoreBtn = $("undoRestoreBtn");
  const downloadFileBtn = $("downloadBackupFileBtn");
  const importFileBtn = $("importBackupFileBtn");
  const importFileInput = $("importBackupFileInput");
  const statusLine = $("googleStatus");
  const backupMetaLine = $("backupMeta");
  const autoBackupToggle = $("autoBackupEnabled");

  initFileBackup();
  initUndoRestore();

  if (!signInBtn || !signOutBtn || !backupBtn || !restoreBtn || !deleteBtn || !statusLine || !backupMetaLine || !autoBackupToggle) {
    return;
  }

  const clientId = getClientId();
  let linked = loadJSON(GOOGLE_CONNECTED_KEY, false) === true;
  let accessToken = "";
  let tokenExpiry = 0;
  let tokenClient = null;
  let tokenRequest = null;
  let isBusy = false;
  let statusOverride = "";
  let autoBackupTimer = null;
  let autoBackupPending = false;
  let lastAutoBackupAt = 0;
  let reconnectToastShown = false;
  let remoteFiles = [];
  let lastSettingsSig = settingsSignature(loadJSON(SETTINGS_KEY, {}));
  const actionButtons = [backupBtn, restoreBtn, deleteBtn];
  const originalLabels = new Map(actionButtons.map((btn) => [btn, btn.textContent]));

  // ---- UI state -----------------------------------------------------------

  function isTokenValid() {
    return !!accessToken && Date.now() < tokenExpiry;
  }

  function renderStatus() {
    const hint = loadJSON(GOOGLE_HINT_KEY, "");
    const who = hint ? ` as ${hint}` : "";
    const needsReconnect = linked && !isTokenValid();

    signInBtn.hidden = linked && !needsReconnect;
    signInBtn.textContent = linked ? "Reconnect Google" : "Connect Google";
    signInBtn.disabled = !clientId || isBusy;
    signOutBtn.hidden = !linked;
    actionButtons.forEach((btn) => {
      btn.disabled = !linked || isBusy;
    });

    let text;
    if (!clientId) text = "Google backup isn't configured for this site.";
    else if (statusOverride) text = statusOverride;
    else if (!linked) text = "Not connected.";
    else if (!needsReconnect) text = `Connected to Google Drive${who}.`;
    else if (state.autoBackupEnabled && autoBackupPending)
      text = `Linked${who}. Auto-backup is waiting — tap Reconnect Google to resume.`;
    else text = `Linked${who}. Google will ask you to confirm on the next backup.`;
    statusLine.textContent = text;
  }

  function setStatus(text) {
    statusOverride = text || "";
    renderStatus();
  }

  function updateBackupMetaLine() {
    const meta = getBackupMeta();
    const parts = [`Last backup: ${formatTimestamp(meta.lastBackupAt)}.`];
    if (meta.lastFileBackupAt) parts.push(`Last file backup: ${formatTimestamp(meta.lastFileBackupAt)}.`);
    parts.push(`Last restore: ${formatTimestamp(meta.lastRestoreAt)}.`);
    backupMetaLine.textContent = parts.join(" ");
  }

  function setLinked(next) {
    linked = !!next;
    if (linked) saveJSON(GOOGLE_CONNECTED_KEY, true);
    else localStorage.removeItem(GOOGLE_CONNECTED_KEY);
    renderStatus();
  }

  function setBusy(activeBtn, label) {
    isBusy = !!activeBtn;
    actionButtons.forEach((btn) => {
      if (!isBusy) {
        btn.textContent = originalLabels.get(btn);
        btn.classList.remove("isBusy");
      }
    });
    if (activeBtn) {
      activeBtn.textContent = label;
      activeBtn.classList.add("isBusy");
    }
    renderStatus();
  }

  // ---- Tokens ---------------------------------------------------------------

  function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    if (!clientId) throw new BackupError("config", "Google backup isn't configured for this site.");
    if (!isGisReady()) return null;
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        const pending = tokenRequest;
        tokenRequest = null;
        if (!pending) return;
        if (response?.error) {
          pending.reject(new BackupError("auth", response.error));
          return;
        }
        if (!window.google.accounts.oauth2.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
          pending.reject(new BackupError("auth", "Drive access wasn't granted. Please allow it to back up."));
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + (Number(response.expires_in) || 3600) * 1000 - 60000;
        statusOverride = "";
        setLinked(true);
        pending.resolve(accessToken);
        rememberAccountHint();
        if (autoBackupPending) scheduleAutoBackup();
      },
      error_callback: (error) => {
        // Popup blocked, closed by the user, or other non-OAuth failure.
        const pending = tokenRequest;
        tokenRequest = null;
        pending?.reject(new BackupError("auth", error?.type || "token_request_failed"));
      }
    });
    return tokenClient;
  }

  /**
   * Get an access token. Must be called synchronously inside a click handler
   * (before any await) when a popup may be needed, or browsers block it.
   * Non-interactive callers never open a popup: they get a "reauth" error.
   */
  function ensureAccessToken({ interactive }) {
    if (isTokenValid()) return Promise.resolve(accessToken);
    if (!interactive) return Promise.reject(new BackupError("reauth", "Google session expired"));
    if (tokenRequest) return tokenRequest.promise;

    let client;
    try {
      client = ensureTokenClient();
    } catch (error) {
      return Promise.reject(error);
    }

    const pending = {};
    pending.promise = new Promise((resolve, reject) => {
      pending.resolve = resolve;
      pending.reject = reject;
    });
    tokenRequest = pending;

    const request = (c) => {
      const hint = loadJSON(GOOGLE_HINT_KEY, "");
      c.requestAccessToken({ prompt: "", ...(hint ? { login_hint: hint } : {}) });
    };

    try {
      if (client) {
        request(client);
      } else {
        // GIS not loaded yet (slow network): load, then try. The popup may be
        // blocked if this takes long; the error path offers a retry button.
        loadGis()
          .then(() => request(ensureTokenClient()))
          .catch((error) => {
            tokenRequest = null;
            pending.reject(error);
          });
      }
    } catch (error) {
      tokenRequest = null;
      pending.reject(error);
    }
    return pending.promise;
  }

  function clearToken() {
    accessToken = "";
    tokenExpiry = 0;
  }

  async function rememberAccountHint() {
    try {
      const about = await driveFetch(`${DRIVE_API}/about?fields=user(emailAddress)`, {}, { interactive: false });
      const email = about?.user?.emailAddress;
      if (email) {
        saveJSON(GOOGLE_HINT_KEY, email);
        renderStatus();
      }
    } catch {
      // Optional nicety only.
    }
  }

  // ---- Drive requests -------------------------------------------------------

  async function driveFetch(url, options = {}, { interactive = false, as = "json", retried = false } = {}) {
    const token = await ensureAccessToken({ interactive });
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
      });
    } catch (error) {
      throw new BackupError(navigator.onLine === false ? "offline" : "network", error?.message);
    }

    if (!retried) {
      if (response.status === 401) {
        // Token expired early or was revoked: drop it and try once more.
        clearToken();
        return driveFetch(url, options, { interactive, as, retried: true });
      }
      if (response.status === 429 || response.status >= 500) {
        await delay(1500);
        return driveFetch(url, options, { interactive, as, retried: true });
      }
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 401) {
        clearToken();
        throw new BackupError("auth", text, 401);
      }
      throw new BackupError("http", text, response.status);
    }
    if (as === "json") return response.json();
    if (as === "text") return response.text();
    return null;
  }

  /** All Cosmic 36 files in the app data folder: { latest, snapshots[] }. */
  async function listRemote(opts) {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      pageSize: "200",
      q: "trashed=false",
      fields: "files(id,name,modifiedTime)"
    });
    const data = await driveFetch(`${DRIVE_API}/files?${params}`, {}, opts);
    const files = data.files || [];
    const latest = files.find((f) => f.name === BACKUP_FILENAME) || null;
    const snapshots = files
      .map((f) => ({ ...f, day: SNAPSHOT_RE.exec(f.name)?.[1] }))
      .filter((f) => f.day)
      .sort((a, b) => b.day.localeCompare(a.day));
    remoteFiles = files;
    return { latest, snapshots };
  }

  function multipart(metadata, data) {
    const boundary = `cosmic36-${crypto.randomUUID()}`;
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      JSON.stringify(data),
      `--${boundary}--`
    ].join("\r\n");
    return { body, headers: { "Content-Type": `multipart/related; boundary=${boundary}` } };
  }

  function uploadFile(name, fileId, payload, opts) {
    const metadata = fileId ? { name } : { name, parents: ["appDataFolder"] };
    const { body, headers } = multipart(metadata, payload);
    const url = fileId
      ? `${DRIVE_UPLOAD}/files/${fileId}?uploadType=multipart&fields=id,modifiedTime`
      : `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime`;
    return driveFetch(url, { method: fileId ? "PATCH" : "POST", headers, body }, opts);
  }

  async function downloadFile(fileId, opts) {
    const raw = await driveFetch(`${DRIVE_API}/files/${fileId}?alt=media`, {}, { ...opts, as: "text" });
    try {
      return JSON.parse(raw);
    } catch {
      throw new BackupError("invalid", "Backup is not valid JSON");
    }
  }

  function deleteFile(fileId, opts) {
    return driveFetch(`${DRIVE_API}/files/${fileId}`, { method: "DELETE" }, { ...opts, as: "none" });
  }

  /** Keep one snapshot per day (the first backup of that day), at most SNAPSHOT_KEEP. */
  async function rotateSnapshots(snapshots, payload, opts) {
    try {
      const today = localDateKey();
      let list = snapshots;
      if (!snapshots.some((s) => s.day === today)) {
        await uploadFile(`cosmic36-backup-${today}.json`, "", payload, opts);
        list = [{ day: today }, ...snapshots];
      }
      const stale = list.slice(SNAPSHOT_KEEP).filter((s) => s.id);
      for (const s of stale) await deleteFile(s.id, opts);
    } catch (error) {
      console.warn("Snapshot rotation failed", error);
    }
  }

  // ---- Backup ---------------------------------------------------------------

  /**
   * Upload this device's data. Returns { ok, reason }.
   * auto=true never prompts; it pauses with a status message instead.
   */
  async function runBackup({ auto }) {
    const opts = { interactive: !auto };
    const meta = getBackupMeta();
    const payload = buildBackupPayload();
    const entries = countEntries(payload.store);
    const { latest, snapshots } = await listRemote(opts);

    // Another device (or a fresh install) would be overwritten: merge instead.
    const remoteChanged = latest && latest.modifiedTime !== meta.remoteModifiedTime;
    if (remoteChanged) {
      if (auto) return { ok: false, reason: "conflict" };
      const when = formatTimestamp(latest.modifiedTime);
      const merge = await showConfirm({
        title: "Drive has other changes",
        message: `The backup in Google Drive was updated on ${when}, from another device or before this browser was linked. Merge it with this device's notes, then back up? Nothing is deleted.`,
        confirmText: "Merge & back up",
        cancelText: "Cancel"
      });
      if (!merge) return { ok: false, reason: "cancelled" };
      const remote = await downloadFile(latest.id, opts);
      if (!isValidBackup(remote)) throw new BackupError("invalid");
      const merged = { ...payload, store: mergeStores(payload.store, remote.store) };
      const saved = await uploadFile(BACKUP_FILENAME, latest.id, merged, opts);
      await rotateSnapshots(snapshots, merged, opts);
      const now = new Date().toISOString();
      applyBackupAndReload(
        { ...merged, settings: loadJSON(SETTINGS_KEY, {}) },
        {
          message: "Merged and backed up. Reloading…",
          meta: { lastBackupAt: now, remoteModifiedTime: saved.modifiedTime, lastRestoreAt: meta.lastRestoreAt || "" }
        }
      );
      return { ok: true, reason: "merged" };
    }

    // Large drop in written entries (e.g. cleared cycle): don't silently overwrite.
    const lastCount = Number(meta.lastEntryCount) || 0;
    if (lastCount >= SHRINK_MIN_ENTRIES && entries < lastCount * SHRINK_RATIO) {
      if (auto) return { ok: false, reason: "shrink", entries, lastCount };
      const ok = await showConfirm({
        title: "Fewer notes than last backup",
        message: `This device has ${entries} entries; your last backup had ${lastCount}. Back up anyway? Older daily snapshots stay in Drive.`,
        confirmText: "Back up anyway",
        cancelText: "Cancel",
        tone: "danger"
      });
      if (!ok) return { ok: false, reason: "cancelled" };
    }

    const saved = await uploadFile(BACKUP_FILENAME, latest?.id || "", payload, opts);
    await rotateSnapshots(snapshots, payload, opts);
    setBackupMeta({
      lastBackupAt: new Date().toISOString(),
      remoteModifiedTime: saved.modifiedTime,
      lastEntryCount: entries
    });
    updateBackupMetaLine();
    return { ok: true };
  }

  async function offerSignInAgain(title, error) {
    if (error?.kind !== "auth") return;
    const retry = await showConfirm({
      title,
      message: error.message?.includes("Drive access") ? error.message : "Google needs you to sign in again.",
      confirmText: "Sign in again",
      cancelText: "Dismiss"
    });
    if (!retry) return;
    try {
      clearToken();
      await ensureAccessToken({ interactive: true });
      showToast("Signed in again.", "success");
    } catch (err) {
      console.error(err);
      showToast("Sign-in failed.", "warn");
    }
  }

  async function handleBackupClick() {
    if (isBusy) return;
    // Start the token request synchronously so the popup counts as user-initiated.
    const tokenPromise = ensureAccessToken({ interactive: true });
    setBusy(backupBtn, "Backing up…");
    try {
      await tokenPromise;
      const result = await runBackup({ auto: false });
      if (result.ok && result.reason !== "merged") {
        autoBackupPending = false;
        statusOverride = "";
        showToast("Backup saved to Google Drive.", "success");
      }
    } catch (error) {
      console.error(error);
      showToast(`Backup failed. ${describeError(error)}`, "warn");
      if (error.kind === "offline") autoBackupPending = true;
      await offerSignInAgain("Backup failed", error);
    } finally {
      setBusy(null);
    }
  }

  // ---- Auto-backup ----------------------------------------------------------

  function scheduleAutoBackup() {
    if (!state.autoBackupEnabled || !linked) return;
    autoBackupPending = true;
    if (autoBackupTimer) return;
    // Throttle, but never drop a change: wait until the window ends instead.
    const wait = Math.max(AUTO_BACKUP_DELAY, lastAutoBackupAt + AUTO_BACKUP_MIN_INTERVAL - Date.now());
    autoBackupTimer = window.setTimeout(runAutoBackup, wait);
  }

  async function runAutoBackup() {
    autoBackupTimer = null;
    if (!autoBackupPending || !state.autoBackupEnabled || !linked) return;
    if (isBusy) {
      scheduleAutoBackup();
      return;
    }
    if (navigator.onLine === false) {
      setStatus("Offline — auto-backup will run when you're back online.");
      return;
    }
    if (!isTokenValid()) {
      // Never open a popup without a click (browsers block it). Ask instead.
      renderStatus();
      if (!reconnectToastShown) {
        reconnectToastShown = true;
        showToast("Auto-backup paused: reconnect Google in Settings.", "warn");
      }
      return;
    }

    autoBackupPending = false;
    isBusy = true;
    try {
      const result = await runBackup({ auto: true });
      if (result.ok) {
        lastAutoBackupAt = Date.now();
        setStatus("");
      } else if (result.reason === "conflict") {
        setStatus("Auto-backup paused: Drive has changes from another device. Tap Backup now to merge.");
      } else if (result.reason === "shrink") {
        setStatus(
          `Auto-backup paused: ${result.entries} entries vs ${result.lastCount} in the last backup. Tap Backup now to confirm.`
        );
      }
    } catch (error) {
      console.error(error);
      autoBackupPending = true;
      if (error.kind === "offline" || error.kind === "network") {
        setStatus("Offline — auto-backup will run when you're back online.");
      } else {
        setStatus(`Auto-backup failed: ${describeError(error)}`);
      }
    } finally {
      isBusy = false;
      renderStatus();
    }
  }

  function settingsSignature(settings) {
    // usageMs changes on every tab switch; it isn't worth a backup on its own.
    const { usageMs, ...rest } = settings || {};
    return JSON.stringify(rest);
  }

  function handleStorageEvent(event) {
    const key = event?.detail?.key;
    if (key === SETTINGS_KEY) {
      const sig = settingsSignature(loadJSON(SETTINGS_KEY, {}));
      if (sig === lastSettingsSig) return;
      lastSettingsSig = sig;
    } else if (key !== STORE_KEY) {
      return;
    }
    scheduleAutoBackup();
  }

  // ---- Restore --------------------------------------------------------------

  async function handleRestoreClick() {
    if (isBusy) return;
    const tokenPromise = ensureAccessToken({ interactive: true });
    setBusy(restoreBtn, "Loading…");
    let listing;
    try {
      await tokenPromise;
      listing = await listRemote({ interactive: true });
    } catch (error) {
      console.error(error);
      showToast(`Couldn't load backups. ${describeError(error)}`, "warn");
      setBusy(null);
      await offerSignInAgain("Restore failed", error);
      return;
    }
    setBusy(null);

    const { latest, snapshots } = listing;
    if (!latest && !snapshots.length) {
      showToast("No backup found in Google Drive yet.", "warn");
      return;
    }

    if (!restoreDialog || !restoreSelect || !restoreConfirmBtn) {
      const ok = await showConfirm({
        title: "Restore backup",
        message: `Replace this device's notes with the backup from ${formatTimestamp(latest?.modifiedTime)}? You can undo this.`,
        confirmText: "Restore",
        cancelText: "Cancel"
      });
      if (ok) await restoreFrom(latest || snapshots[0], latest);
      return;
    }

    restoreSelect.innerHTML = "";
    const addOption = (file, label) => {
      const opt = document.createElement("option");
      opt.value = file.id;
      opt.textContent = label;
      restoreSelect.appendChild(opt);
    };
    if (latest) addOption(latest, `Latest — ${formatTimestamp(latest.modifiedTime)}`);
    snapshots.forEach((s) => addOption(s, `Daily snapshot — ${s.day}`));
    restoreDialog._latest = latest;
    openDialog(restoreDialog, restoreBtn);
  }

  async function restoreFrom(file, latest) {
    if (!file || isBusy) return;
    setBusy(restoreBtn, "Restoring…");
    try {
      const payload = await downloadFile(file.id, { interactive: true });
      if (!isValidBackup(payload)) throw new BackupError("invalid");
      // Treat the current Drive state as "seen" so the next backup doesn't flag a conflict.
      applyBackupAndReload(payload, { meta: { remoteModifiedTime: latest?.modifiedTime || "" } });
    } catch (error) {
      console.error(error);
      showToast(`Restore failed. ${describeError(error)}`, "warn");
      await offerSignInAgain("Restore failed", error);
    } finally {
      setBusy(null);
    }
  }

  // ---- Delete ---------------------------------------------------------------

  async function handleDeleteConfirmed() {
    if (isBusy) return;
    const tokenPromise = ensureAccessToken({ interactive: true });
    setBusy(deleteBtn, "Deleting…");
    try {
      await tokenPromise;
      const { latest, snapshots } = await listRemote({ interactive: true });
      const files = [latest, ...snapshots].filter(Boolean);
      if (!files.length) {
        showToast("No backup found yet.", "warn");
        return;
      }
      for (const f of files) await deleteFile(f.id, { interactive: true });
      setBackupMeta({ lastBackupAt: "", remoteModifiedTime: "", lastEntryCount: 0 });
      updateBackupMetaLine();
      showToast("All Google Drive backups deleted.", "success");
    } catch (error) {
      console.error(error);
      showToast(`Delete failed. ${describeError(error)}`, "warn");
      await offerSignInAgain("Delete failed", error);
    } finally {
      setBusy(null);
    }
  }

  // ---- Sign in / out --------------------------------------------------------

  async function handleSignInClick() {
    const tokenPromise = ensureAccessToken({ interactive: true });
    try {
      await tokenPromise;
      showToast("Google Drive connected.", "success");
    } catch (error) {
      console.error(error);
      const blocked = /popup/.test(error?.message || "");
      showToast(blocked ? "Sign-in window was blocked or closed." : `Sign-in failed. ${describeError(error)}`, "warn");
      return;
    }

    // New device / new link: if Drive already has a backup, offer it first.
    if (getBackupMeta().remoteModifiedTime) return;
    try {
      const { latest } = await listRemote({ interactive: false });
      if (!latest) return;
      const restore = await showConfirm({
        title: "Backup found",
        message: `Your Google Drive has a Cosmic 36 backup from ${formatTimestamp(latest.modifiedTime)}. Restore it to this device?`,
        confirmText: "Choose version…",
        cancelText: "Not now"
      });
      if (restore) handleRestoreClick();
    } catch (error) {
      console.warn(error);
    }
  }

  function handleSignOut() {
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    clearToken();
    autoBackupPending = false;
    if (autoBackupTimer) window.clearTimeout(autoBackupTimer);
    autoBackupTimer = null;
    statusOverride = "";
    localStorage.removeItem(GOOGLE_HINT_KEY);
    setBackupMeta({ remoteModifiedTime: "", lastEntryCount: 0 });
    setLinked(false);
  }

  // ---- Wiring ---------------------------------------------------------------

  signInBtn.addEventListener("click", handleSignInClick);
  signOutBtn.addEventListener("click", () => {
    handleSignOut();
    showToast("Signed out.");
  });
  backupBtn.addEventListener("click", handleBackupClick);
  restoreBtn.addEventListener("click", handleRestoreClick);

  deleteBtn.addEventListener("click", () => {
    if (deleteDialog && deleteConfirmBtn && deleteCancelBtn) openDialog(deleteDialog, deleteBtn);
    else handleDeleteConfirmed();
  });
  deleteConfirmBtn?.addEventListener("click", () => {
    // Token request must start inside this click; closing the dialog first is fine.
    if (deleteDialog) closeDialog(deleteDialog, deleteBtn);
    handleDeleteConfirmed();
  });
  deleteCancelBtn?.addEventListener("click", () => deleteDialog && closeDialog(deleteDialog, deleteBtn));
  deleteDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(deleteDialog, deleteBtn);
  });

  restoreConfirmBtn?.addEventListener("click", () => {
    const fileId = restoreSelect?.value;
    const file = remoteFiles.find((f) => f.id === fileId);
    const latest = restoreDialog._latest;
    closeDialog(restoreDialog, restoreBtn);
    restoreFrom(file, latest);
  });
  restoreCancelBtn?.addEventListener("click", () => closeDialog(restoreDialog, restoreBtn));
  restoreDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(restoreDialog, restoreBtn);
  });

  autoBackupToggle.checked = !!state.autoBackupEnabled;
  autoBackupToggle.addEventListener("change", () => {
    state.autoBackupEnabled = autoBackupToggle.checked;
    saveSettings(state);
    showToast(state.autoBackupEnabled ? "Auto-backup on." : "Auto-backup off.");
    renderStatus();
  });

  document.addEventListener("cosmic36:localstorage-saved", handleStorageEvent);
  window.addEventListener("online", () => {
    if (statusOverride.startsWith("Offline")) setStatus("");
    if (autoBackupPending) scheduleAutoBackup();
  });
  // Best effort: push pending changes before the tab goes to the background.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !autoBackupPending || !isTokenValid()) return;
    if (autoBackupTimer) window.clearTimeout(autoBackupTimer);
    runAutoBackup();
  });

  // Preload GIS when idle so the sign-in popup opens instantly on click.
  if (clientId) {
    const preload = () => loadGis().then(renderStatus).catch(() => {});
    if ("requestIdleCallback" in window) window.requestIdleCallback(preload, { timeout: 4000 });
    else window.setTimeout(preload, 1500);
  }

  renderStatus();
  updateBackupMetaLine();

  // ---- File backup & undo (work without Google) ----------------------------

  function initFileBackup() {
    downloadFileBtn?.addEventListener("click", () => {
      const payload = buildBackupPayload();
      downloadTextFile(`cosmic36-backup-${localDateKey()}.json`, JSON.stringify(payload, null, 2));
      setBackupMeta({ lastFileBackupAt: payload.createdAt });
      if (backupMetaLine) updateBackupMetaLine();
      showToast("Backup file downloaded.", "success");
    });

    importFileBtn?.addEventListener("click", () => importFileInput?.click());
    importFileInput?.addEventListener("change", async () => {
      const file = importFileInput.files?.[0];
      importFileInput.value = "";
      if (!file) return;
      let payload;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        payload = null;
      }
      if (!isValidBackup(payload)) {
        showToast("That file isn't a Cosmic 36 backup.", "warn");
        return;
      }
      const ok = await showConfirm({
        title: "Import backup",
        message: `Replace this device's notes with the backup from ${formatTimestamp(payload.createdAt)} (${countEntries(payload.store)} entries)? You can undo this.`,
        confirmText: "Import",
        cancelText: "Cancel"
      });
      if (ok) applyBackupAndReload(payload, { message: "Backup imported. Reloading…" });
    });
  }

  function initUndoRestore() {
    if (!undoRestoreBtn) return;
    const snapshot = loadJSON(PRE_RESTORE_KEY, null);
    if (!snapshot?.store || !snapshot?.settings) return;
    undoRestoreBtn.hidden = false;
    undoRestoreBtn.textContent = `Undo last restore (data from ${formatTimestamp(snapshot.savedAt)})`;
    undoRestoreBtn.addEventListener("click", async () => {
      const ok = await showConfirm({
        title: "Undo restore",
        message: "Put back the notes this device had before the last restore or import?",
        confirmText: "Undo restore",
        cancelText: "Cancel"
      });
      if (!ok) return;
      saveJSON(SETTINGS_KEY, snapshot.settings);
      saveJSON(STORE_KEY, snapshot.store);
      localStorage.removeItem(PRE_RESTORE_KEY);
      showToast("Restore undone. Reloading…", "success");
      window.setTimeout(() => window.location.reload(), 600);
    });
  }
}
