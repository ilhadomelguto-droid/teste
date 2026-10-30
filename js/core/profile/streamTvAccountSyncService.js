import { STREAMTV_API_BASE_URL } from "../../config.js";
import {
  exportAccountLocalData,
  importAccountLocalData,
  resetAccountRuntimeState
} from "../auth/accountLocalDataReset.js";
import { SessionStore } from "../storage/sessionStore.js";
import { streamTvGetAccountConfig, streamTvPutAccountConfig } from "../auth/streamTvAuthFetch.js";
import { addonRepository } from "../../data/repository/addonRepository.js";

const SCHEMA_VERSION = 1;
const POLL_INTERVAL_MS = 15000;

function fingerprint(value) {
  return JSON.stringify(value);
}

function normalizeRemote(response) {
  const revision = Math.max(0, Number(response?.revision) || 0);
  const payload = response?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { revision, data: {}, empty: true };
  }
  const data = payload.data;
  return {
    revision,
    data: data && typeof data === "object" && !Array.isArray(data) ? data : {},
    empty: Object.keys(data || {}).length === 0
  };
}

function createPayload(data) {
  return { schemaVersion: SCHEMA_VERSION, data };
}

export const StreamTvAccountSyncService = {
  started: false,
  intervalId: null,
  inFlight: null,
  revision: 0,
  lastSyncedFingerprint: null,

  isEnabled() {
    return Boolean(
      STREAMTV_API_BASE_URL && SessionStore.accessToken && !SessionStore.isAnonymousSession
    );
  },

  async initialize() {
    if (!this.isEnabled()) return false;
    return this.sync({ initial: true });
  },

  start() {
    if (this.started || !this.isEnabled()) return;
    this.started = true;
    this.intervalId = setInterval(() => {
      void this.sync().catch(() => {});
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void this.sync().catch(() => {});
    };
    this.onVisible = onVisible;
    document.addEventListener("visibilitychange", onVisible);
  },

  stop() {
    this.started = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    if (this.onVisible) document.removeEventListener("visibilitychange", this.onVisible);
    this.onVisible = null;
    this.inFlight = null;
    this.revision = 0;
    this.lastSyncedFingerprint = null;
  },

  async sync({ initial = false } = {}) {
    if (!this.isEnabled()) return false;
    if (this.inFlight) return this.inFlight;
    const run = async () => {
      const token = SessionStore.accessToken;
      const remote = normalizeRemote(await streamTvGetAccountConfig(token));
      const local = exportAccountLocalData();
      const localFingerprint = fingerprint(local);
      const remoteFingerprint = fingerprint(remote.data);

      // On a second device, remote state wins until the user changes something
      // locally. This prevents startup defaults from erasing the account.
      if (!remote.empty && (initial || this.lastSyncedFingerprint === localFingerprint)) {
        if (remoteFingerprint !== localFingerprint) {
          if (!importAccountLocalData(remote.data)) return false;
          await resetAccountRuntimeState();
          // AddonRepository keeps manifests and the installed-list result in
          // memory. The snapshot replaces localStorage directly, so make the
          // mounted catalog observe it without treating it as a local edit.
          addonRepository.invalidateInstalledAddonsCache();
          addonRepository.notifyAddonsChanged("remote-pull");
        }
        this.revision = remote.revision;
        this.lastSyncedFingerprint = remoteFingerprint;
        return true;
      }

      if (remoteFingerprint === localFingerprint && !remote.empty) {
        this.revision = remote.revision;
        this.lastSyncedFingerprint = localFingerprint;
        return true;
      }

      try {
        const saved = await streamTvPutAccountConfig(token, createPayload(local), remote.revision);
        this.revision = Math.max(0, Number(saved?.revision) || remote.revision + 1);
        this.lastSyncedFingerprint = localFingerprint;
        return true;
      } catch (error) {
        // A different device saved between GET and PUT. The next cycle pulls
        // its newer revision instead of retrying blindly over it.
        if (Number(error?.status) === 409) {
          this.lastSyncedFingerprint = null;
          return false;
        }
        throw error;
      }
    };
    this.inFlight = run();
    try {
      return await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }
};
