function sourceValues(stream = {}) {
  const raw = stream?.raw && typeof stream.raw === "object" ? stream.raw : {};
  return [
    stream?.url,
    stream?.externalUrl,
    stream?.source,
    stream?.sourceType,
    raw?.url,
    raw?.externalUrl,
    raw?.source,
    raw?.sourceType
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

/** Identifies StreamTV's Google Drive relay without depending on its addon name. */
export function isGoogleDriveStream(stream = {}) {
  return sourceValues(stream).some((value) =>
    /(?:\/play\/gdrive\/|drive\.google\.com|googleusercontent\.com)/i.test(value)
  );
}

/** User-facing source identity. Internal provider names must not leak into cards. */
export function getStreamSourceDisplayName(stream = {}) {
  return isGoogleDriveStream(stream)
    ? "Veloz"
    : String(stream?.addonName || stream?.raw?.addonName || "Addon").trim() || "Addon";
}

/** Google Drive is the preferred direct source and belongs at the top of source lists. */
export function streamSourcePriority(stream = {}) {
  return isGoogleDriveStream(stream) ? -1 : 0;
}
