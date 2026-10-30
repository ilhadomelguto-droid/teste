const PROFILE_SCOPED_VERSION = 1;

// These values describe account/profile state only. Device identity, generic
// image caches, and offline downloads deliberately remain outside this list.
const ACCOUNT_LOCAL_STORAGE_KEYS = new Set([
  "profiles",
  "activeProfileId",
  "rememberLastProfile",
  "hasEverSelectedProfile",
  "installedAddonUrls",
  "installedAddonDisplayNames",
  "installedAddonEnabledStates",
  "watchedItems",
  "savedLibraryItems",
  "watchProgressItems",
  "streamPreferences",
  "trackPreferences",
  "trackPreferenceSyncPayload",
  "continueWatchingPreferences",
  "libraryPreferences",
  "traktAuthState",
  "simklAuthState",
  "simklSyncState",
  "startupSyncState",
  "watchProgressSyncState",
  "watchedItemsSyncState",
  "profileSettingsSyncCache",
  "profileSettingsSyncPendingProfiles",
  "homeCatalogSettingsPendingPushTokens",
  "providerCredentialSyncPendingProfiles",
  "homeContinueWatchingDisplaySnapshot",
  "homeContinueWatchingEnrichmentCache",
  "browserProfileAvatarCacheIndex",
  "memberAccessCache",
  "manualSyncCode",
  "pluginSources",
  "pluginsEnabled",
  "pluginState:migrationComplete",
  "nuvioSyncBackoffState"
]);

const ACCOUNT_LOCAL_STORAGE_PREFIXES = [
  "cloudLibraryPlaybackSessions:",
  "cloudLibraryPlaybackProgress:",
  "libraryTraktState:",
  "traktCachedStats:"
];

// Derived artwork and retry bookkeeping can grow without bound and are rebuilt
// from the real account state. They must not consume the server's deliberately
// small account-document quota, which is reserved for profiles, addons,
// settings, favourites and watch progress.
const ACCOUNT_SNAPSHOT_EXCLUDED_KEYS = new Set([
  "homeContinueWatchingDisplaySnapshot",
  "homeContinueWatchingEnrichmentCache",
  "browserProfileAvatarCacheIndex",
  "memberAccessCache",
  "manualSyncCode",
  "nuvioSyncBackoffState",
  "profileSettingsSyncCache",
  "profileSettingsSyncPendingProfiles",
  "homeCatalogSettingsPendingPushTokens",
  "providerCredentialSyncPendingProfiles"
]);
const ACCOUNT_SNAPSHOT_EXCLUDED_PREFIXES = ["traktCachedStats:"];

// Nothing survives a sign-out.
//
// Torrent settings used to, on the reasoning that they describe this device
// rather than this account: turning uploading off on a metered laptop should not
// quietly turn itself back on. That holds only while the same person signs back
// in. Let someone else in and the "device preference" is really the previous
// person's, and two of the three switches decide whether this machine uploads --
// which costs bandwidth and, in some places, rather more than that.
//
// Inheriting a stranger's upload setting is silent. Losing your own is visible
// and takes one tap to put back. The visible mistake is the cheaper one.
//
// It also carried the previous account's profile ids across, so a new account's
// storage still named profiles that had never belonged to it.
const PRESERVED_PROFILE_SCOPED_KEYS = new Set();
const runtimeResetHandlers = new Set();

function isProfileScopedEnvelope(rawValue) {
  if (typeof rawValue !== "string" || !rawValue) return false;
  try {
    const value = JSON.parse(rawValue);
    return Boolean(
      value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value.__profileScoped === true &&
        Number(value.version || 0) === PROFILE_SCOPED_VERSION &&
        value.profiles &&
        typeof value.profiles === "object" &&
        !Array.isArray(value.profiles)
    );
  } catch (_) {
    return false;
  }
}

function shouldRemoveLocalStorageKey(key, rawValue) {
  if (PRESERVED_PROFILE_SCOPED_KEYS.has(key)) return false;
  return (
    ACCOUNT_LOCAL_STORAGE_KEYS.has(key) ||
    ACCOUNT_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
    isProfileScopedEnvelope(rawValue)
  );
}

// The same boundary is used for a remote account snapshot. Keeping this next
// to sign-out cleanup prevents session tokens, device IDs, downloads and image
// caches from accidentally becoming account data.
export function exportAccountLocalData(storage = globalThis.localStorage) {
  const entries = {};
  if (!storage) return entries;
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const rawValue = storage.getItem(key);
      if (
        shouldRemoveLocalStorageKey(key, rawValue) &&
        !ACCOUNT_SNAPSHOT_EXCLUDED_KEYS.has(key) &&
        !ACCOUNT_SNAPSHOT_EXCLUDED_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
        typeof rawValue === "string"
      ) {
        entries[key] = rawValue;
      }
    }
  } catch (_) {
    // Browser storage can be unavailable in private modes. Local operation
    // continues; the next successful cycle will retry.
  }
  return entries;
}

export function importAccountLocalData(entries, storage = globalThis.localStorage) {
  if (!storage || !entries || typeof entries !== "object" || Array.isArray(entries)) return false;
  try {
    const currentKeys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) currentKeys.push(key);
    }
    currentKeys.forEach((key) => {
      if (shouldRemoveLocalStorageKey(key, storage.getItem(key))) storage.removeItem(key);
    });
    Object.entries(entries).forEach(([key, value]) => {
      if (typeof key !== "string" || typeof value !== "string") return;
      // Do not trust a remote document to expand the allow-list.
      if (shouldRemoveLocalStorageKey(key, value)) storage.setItem(key, value);
    });
    return true;
  } catch (_) {
    return false;
  }
}

export function registerAccountRuntimeResetHandler(handler) {
  if (typeof handler !== "function") return () => {};
  runtimeResetHandlers.add(handler);
  return () => runtimeResetHandlers.delete(handler);
}

export async function resetAccountRuntimeState() {
  await Promise.allSettled(Array.from(runtimeResetHandlers, (handler) => handler()));
}

export function clearAccountLocalData(
  storage = globalThis.localStorage,
  sessionStorage = globalThis.sessionStorage
) {
  if (storage) {
    const keys = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key) keys.push(key);
      }
    } catch (_) {
      // Best effort: session cleanup still prevents route/focus leakage.
    }

    keys.forEach((key) => {
      try {
        const raw = storage.getItem(key);
        if (shouldRemoveLocalStorageKey(key, raw)) storage.removeItem(key);
      } catch (_) {
        // Never leave sensitive values in diagnostics.
      }
    });
  }

  try {
    sessionStorage?.removeItem?.("homeReturnFocusState");
  } catch (_) {}
}

export function hasAccountLocalData(storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && shouldRemoveLocalStorageKey(key, storage.getItem(key))) return true;
    }
  } catch (_) {
    return true;
  }
  return false;
}
