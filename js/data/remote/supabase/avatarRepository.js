import { AVATAR_PUBLIC_BASE_URL, SUPABASE_URL } from "../../../config.js";
import { SupabaseApi } from "./supabaseApi.js";
import { BUILT_IN_PROFILE_AVATARS } from "../../local/profileAvatarCatalog.js";

const AVATAR_BUCKET = "avatars";

let cachedCatalog = null;

function mergeCatalog(remoteCatalog = []) {
  const byId = new Map();
  // Keep server-provided entries when their ids happen to overlap, while the
  // built-in StreamTV collection is always available offline.
  [...BUILT_IN_PROFILE_AVATARS, ...remoteCatalog].forEach((avatar) => {
    if (avatar?.id && avatar?.imageUrl) byId.set(avatar.id, avatar);
  });
  return Array.from(byId.values()).sort((left, right) => {
    const categoryOrder = String(left.category || "").localeCompare(String(right.category || ""));
    return categoryOrder || Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
  });
}

function avatarImageUrl(storagePath = "") {
  const normalizedPath = String(storagePath || "")
    .trim()
    .replace(/^\/+/, "");
  if (!normalizedPath) {
    return null;
  }
  const configuredBaseUrl = String(AVATAR_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/${normalizedPath}`;
  }
  return `${String(SUPABASE_URL || "").replace(/\/+$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/${normalizedPath}`;
}

function mapAvatar(row = {}) {
  return {
    id: String(row.id || ""),
    displayName: String(row.display_name || row.displayName || "Avatar"),
    imageUrl: avatarImageUrl(row.storage_path || row.storagePath || ""),
    category: String(row.category || "all")
      .trim()
      .toLowerCase(),
    sortOrder: Number(row.sort_order || row.sortOrder || 0),
    bgColor: row.bg_color || row.bgColor || null
  };
}

export const AvatarRepository = {
  async getAvatarCatalog() {
    if (Array.isArray(cachedCatalog) && cachedCatalog.length) {
      return cachedCatalog;
    }

    try {
      const response = await SupabaseApi.rpc("get_avatar_catalog", {}, false);
      const remoteCatalog = (Array.isArray(response) ? response : [])
        .map((row) => mapAvatar(row))
        .filter((avatar) => avatar.id && avatar.imageUrl);
      cachedCatalog = mergeCatalog(remoteCatalog);
    } catch (_error) {
      // Avatar artwork must never make profile creation depend on Supabase.
      cachedCatalog = mergeCatalog();
    }
    return cachedCatalog;
  },

  getAvatarImageUrl(avatarId, catalog = cachedCatalog || []) {
    const normalizedId = String(avatarId || "").trim();
    if (!normalizedId) {
      return null;
    }
    return catalog.find((avatar) => avatar.id === normalizedId)?.imageUrl || null;
  },

  invalidateCache() {
    cachedCatalog = null;
  }
};
