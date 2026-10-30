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

function endpoint(path) {
  const baseUrl = normalizedBaseUrl();
  if (!baseUrl) {
    throw new Error("StreamTV login is not configured");
  }
  return `${baseUrl}/api/auth/${path}`;
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
  const standalone = globalThis.matchMedia?.("(display-mode: standalone)")?.matches
    || globalThis.navigator?.standalone === true;
  return standalone ? "pwa" : "web";
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

async function request(path, { method = "GET", token = "", body } = {}) {
  const response = await fetch(endpoint(path), {
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
  return toSession(await request("login", { method: "POST", body: { identifier, password } }));
}

export async function streamTvRefresh(refreshToken) {
  return toSession(await request("refresh", { method: "POST", body: { refreshToken } }));
}

export async function streamTvMe(token) {
  return request("me", { token });
}

export async function streamTvLogout(token) {
  return request("logout", { method: "POST", token });
}
