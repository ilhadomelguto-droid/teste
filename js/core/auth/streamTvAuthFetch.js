import { STREAMTV_API_BASE_URL } from "../../config.js";

const DEVICE_ID_KEY = "streamtv_device_id";
// Auth server compares this as a semantic version, not a display label.
const CLIENT_VERSION = "1.0.0";

function normalizedBaseUrl() {
  return String(STREAMTV_API_BASE_URL || "")
    .trim()
    .replace(/\/(?:api(?:\/auth)?)?\/?$/i, "")
    .replace(/\/+$/, "");
}

function apiEndpoint(path) {
  const baseUrl = normalizedBaseUrl();
  if (!baseUrl) {
    throw new Error("StreamTV login is not configured");
  }
  return `${baseUrl}/api/${String(path || "").replace(/^\/+/, "")}`;
}

function createDeviceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function getStreamTvDeviceId() {
  try {
    const existing = String(globalThis.localStorage?.getItem(DEVICE_ID_KEY) || "").trim();
    if (existing) return existing;
    const deviceId = createDeviceId();
    globalThis.localStorage?.setItem?.(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch {
    return createDeviceId();
  }
}

function getClientPlatform() {
  // A browser tab and its installed PWA share this application's storage and
  // are the same physical device. Keep one stable identity for both modes;
  // otherwise reopening the same account in the other mode makes the server
  // interpret the refresh as a device mismatch and revoke the session.
  return "web";
}

function headers({ token = "", json = false } = {}) {
  return {
    "X-Device-Id": getStreamTvDeviceId(),
    "X-Client-Platform": getClientPlatform(),
    "X-App-Version": CLIENT_VERSION,
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function requestApi(path, { method = "GET", token = "", body } = {}) {
  const response = await fetch(apiEndpoint(path), {
    method,
    headers: headers({ token, json: body !== undefined }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) {
    let message = "";
    try {
      const payload = await response.json();
      message = String(payload?.message || payload?.error || "").trim();
    } catch {
      message = String(await response.text().catch(() => "") || "").trim();
    }
    const error = new Error(message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function toSession(payload) {
  const accessToken = String(payload?.token || payload?.accessToken || "").trim();
  const refreshToken = String(payload?.refreshToken || payload?.refresh_token || "").trim();
  if (!accessToken || !refreshToken) throw new Error("Invalid StreamTV session response");
  return { accessToken, refreshToken, user: payload?.user || null };
}

export async function streamTvLogin(identifier, password) {
  return toSession(await requestApi("auth/login", { method: "POST", body: { identifier, password } }));
}

export async function streamTvRefresh(refreshToken) {
  return toSession(await requestApi("auth/refresh", { method: "POST", body: { refreshToken } }));
}

export async function streamTvMe(token) {
  return requestApi("auth/me", { token });
}

export async function streamTvLogout(token) {
  return requestApi("auth/logout", { method: "POST", token });
}

// This config belongs to the StreamTV account, rather than to a browser. It
// deliberately uses the normal user session; no device or administrator token
// can read another account's profile configuration.
export async function streamTvGetAccountConfig(token) {
  return requestApi("nuvio/account-config", { token });
}

export async function streamTvPutAccountConfig(token, payload, expectedRevision) {
  return requestApi("nuvio/account-config", {
    method: "PUT",
    token,
    body: { payload, expectedRevision }
  });
}
