import { BACKUP_META_KEY, SETTINGS_KEY, STORE_KEY } from "../core/constants.js";
import { loadJSON, saveJSON } from "../core/store.js";
import { saveSettings } from "../settings/settings.js";
import { showToast } from "../ui/toast.js";
import { $ } from "../ui/dom.js";

const BACKUP_FILENAME = "cosmic36-backup.json";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

function getClientId() {
  const meta = document.querySelector('meta[name="google-client-id"]');
  return meta?.content?.trim() || "";
}

function isConfiguredClientId(clientId) {
  if (!clientId) return false;
  return !clientId.includes("YOUR_GOOGLE_CLIENT_ID");
}

function getBackupMeta() {
  return loadJSON(BACKUP_META_KEY, { lastBackupAt: "", lastRestoreAt: "" });
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

function isValidBackup(payload) {
  return payload && typeof payload === "object" && payload.store && payload.settings;
}

function formatTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function createMultipartBody(metadata, data) {
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
  return { body, boundary };
}

async function fetchJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json();
}

async function fetchText(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.text();
}

export function initBackup(state) {
  const signInBtn = $("googleSignInBtn");
  const signOutBtn = $("googleSignOutBtn");
  const backupBtn = $("backupNowBtn");
  const restoreBtn = $("restoreNowBtn");
  const statusLine = $("googleStatus");
  const backupMetaLine = $("backupMeta");
  const autoBackupToggle = $("autoBackupEnabled");

  if (!signInBtn || !signOutBtn || !backupBtn || !restoreBtn || !statusLine || !backupMetaLine || !autoBackupToggle) {
    return;
  }

  let accessToken = "";
  let tokenExpiry = 0;
  let autoBackupTimer = null;
  let lastAutoBackupAt = 0;
  let tokenClient = null;

  function updateStatus(text) {
    statusLine.textContent = text;
  }

  function updateBackupMetaLine() {
    const meta = getBackupMeta();
    const lastBackup = formatTimestamp(meta.lastBackupAt);
    const lastRestore = formatTimestamp(meta.lastRestoreAt);
    backupMetaLine.textContent = `Last backup: ${lastBackup}. Last restore: ${lastRestore}.`;
  }

  function setConnected(isConnected) {
    signInBtn.hidden = isConnected;
    signOutBtn.hidden = !isConnected;
    backupBtn.disabled = !isConnected;
    restoreBtn.disabled = !isConnected;
    updateStatus(isConnected ? "Connected to Google Drive (app data)." : "Not connected.");
  }

  function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    const clientId = getClientId();
    if (!isConfiguredClientId(clientId)) {
      updateStatus("Google client ID is not configured yet.");
      signInBtn.disabled = true;
      return null;
    }
    if (!window.google?.accounts?.oauth2) {
      updateStatus("Google sign-in library is not loaded.");
      signInBtn.disabled = true;
      return null;
    }
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: () => {}
    });
    return tokenClient;
  }

  function isTokenValid() {
    return accessToken && Date.now() < tokenExpiry;
  }

  function requestToken(prompt) {
    const client = ensureTokenClient();
    if (!client) return Promise.reject(new Error("Google sign-in is not configured."));
    return new Promise((resolve, reject) => {
      client.callback = (response) => {
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + (response.expires_in || 0) * 1000 - 30000;
        resolve(accessToken);
      };
      client.requestAccessToken({ prompt });
    });
  }

  async function ensureAccessToken(prompt = "") {
    if (isTokenValid()) return accessToken;
    return requestToken(prompt);
  }

  async function findBackupFileId(token) {
    const query = encodeURIComponent(`name='${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=${query}`;
    const data = await fetchJson(url, token);
    return data.files?.[0]?.id || "";
  }

  async function uploadBackup(token, payload) {
    const fileId = await findBackupFileId(token);
    const metadata = fileId
      ? { name: BACKUP_FILENAME }
      : { name: BACKUP_FILENAME, parents: ["appDataFolder"] };
    const { body, boundary } = createMultipartBody(metadata, payload);
    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const method = fileId ? "PATCH" : "POST";
    await fetchJson(url, token, {
      method,
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body
    });
  }

  async function downloadBackup(token) {
    const fileId = await findBackupFileId(token);
    if (!fileId) return null;
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const raw = await fetchText(url, token);
    return JSON.parse(raw);
  }

  async function handleBackup() {
    try {
      const token = await ensureAccessToken();
      const payload = buildBackupPayload();
      await uploadBackup(token, payload);
      setBackupMeta({ lastBackupAt: new Date().toISOString() });
      updateBackupMetaLine();
      showToast("Backup saved to Google Drive.");
    } catch (error) {
      console.error(error);
      showToast("Backup failed. Check your connection.");
    }
  }

  async function handleRestore() {
    try {
      const token = await ensureAccessToken();
      const payload = await downloadBackup(token);
      if (!payload) {
        showToast("No backup found yet.");
        return;
      }
      if (!isValidBackup(payload)) {
        showToast("Backup file is invalid.");
        return;
      }
      saveJSON(SETTINGS_KEY, payload.settings);
      saveJSON(STORE_KEY, payload.store);
      setBackupMeta({ lastRestoreAt: new Date().toISOString() });
      updateBackupMetaLine();
      showToast("Backup restored. Reloading...");
      window.setTimeout(() => window.location.reload(), 400);
    } catch (error) {
      console.error(error);
      showToast("Restore failed. Check your connection.");
    }
  }

  function handleSignOut() {
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = "";
    tokenExpiry = 0;
    setConnected(false);
  }

  function scheduleAutoBackup() {
    if (!state.autoBackupEnabled || !isTokenValid()) return;
    const now = Date.now();
    if (now - lastAutoBackupAt < 30000) return;
    if (autoBackupTimer) window.clearTimeout(autoBackupTimer);
    autoBackupTimer = window.setTimeout(async () => {
      lastAutoBackupAt = Date.now();
      await handleBackup();
    }, 2000);
  }

  function handleStorageEvent(event) {
    const key = event?.detail?.key;
    if (key !== SETTINGS_KEY && key !== STORE_KEY) return;
    scheduleAutoBackup();
  }

  signInBtn.addEventListener("click", async () => {
    try {
      await ensureAccessToken("consent");
      setConnected(true);
      showToast("Google Drive connected.");
    } catch (error) {
      console.error(error);
      showToast("Sign-in failed.");
    }
  });

  signOutBtn.addEventListener("click", () => {
    handleSignOut();
    showToast("Signed out.");
  });

  backupBtn.addEventListener("click", handleBackup);
  restoreBtn.addEventListener("click", handleRestore);

  autoBackupToggle.checked = !!state.autoBackupEnabled;
  autoBackupToggle.addEventListener("change", () => {
    state.autoBackupEnabled = autoBackupToggle.checked;
    saveSettings(state);
    showToast(state.autoBackupEnabled ? "Auto-backup on." : "Auto-backup off.");
  });

  document.addEventListener("cosmic36:localstorage-saved", handleStorageEvent);

  setConnected(false);
  updateBackupMetaLine();
}
