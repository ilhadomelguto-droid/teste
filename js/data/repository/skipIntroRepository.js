import { INTRODB_API_URL } from "../../config.js";
import { TmdbService } from "../../core/tmdb/tmdbService.js";

const CACHE = new Map();

function normalizeImdbId(value = "") {
  const candidate = String(value || "")
    .trim()
    .split(":")[0];
  return /^tt\d+$/i.test(candidate) ? candidate : "";
}

function normalizeBaseUrl(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function introDbSegmentsUrl(baseUrl, parameters) {
  // IntroDB currently permits browser requests only from its own origin. Go
  // through our tightly scoped same-origin bridge when the app is in a
  // browser; native and test environments keep the configurable direct URL.
  const browserOrigin = globalThis.location?.origin;
  const url = browserOrigin && /^https?:$/i.test(globalThis.location?.protocol || "")
    ? new URL("/api/introdb/segments", browserOrigin)
    : new URL("segments", baseUrl);
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function toSkipInterval(segment, type) {
  if (!segment || typeof segment !== "object") {
    return null;
  }
  const start = Number.isFinite(Number(segment.start_sec))
    ? Number(segment.start_sec)
    : Number.isFinite(Number(segment.start_ms))
      ? Number(segment.start_ms) / 1000
      : NaN;
  const end = Number.isFinite(Number(segment.end_sec))
    ? Number(segment.end_sec)
    : Number.isFinite(Number(segment.end_ms))
      ? Number(segment.end_ms) / 1000
      : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return {
    startTime: start,
    endTime: end,
    type,
    provider: "introdb"
  };
}

function toMovieSkipIntervals(data) {
  const credits = toSkipInterval(data?.outro, "movie-credits");
  const postCredits = toSkipInterval(data?.post_credits, "post-credits");
  // Never skip across a post-credit scene when providers return overlapping
  // ranges. This mirrors the current NuvioTV behaviour.
  const safeCredits =
    credits &&
    postCredits &&
    postCredits.startTime < credits.endTime &&
    postCredits.endTime > credits.startTime
      ? { ...credits, endTime: postCredits.startTime }
      : credits;
  return [safeCredits, postCredits]
    .filter((interval) => interval && interval.endTime > interval.startTime)
    .sort((left, right) => left.startTime - right.startTime);
}

async function resolveImdbId(imdbId, tmdbId, type) {
  const direct = normalizeImdbId(imdbId);
  if (direct) return direct;
  const numericTmdbId = String(tmdbId || "").trim();
  if (!/^\d+$/.test(numericTmdbId)) return "";
  try {
    return normalizeImdbId(await TmdbService.tmdbToImdb(numericTmdbId, type));
  } catch (_) {
    return "";
  }
}

async function fetchJson(url, timeoutMs = 3500) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller?.signal
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (_) {
    return null;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export const skipIntroRepository = {
  async getSkipIntervals(imdbId, season, episode, { tmdbId = 0, type = "tv" } = {}) {
    const baseUrl = normalizeBaseUrl(INTRODB_API_URL);
    const normalizedImdbId = await resolveImdbId(imdbId, tmdbId, type);
    const seasonNumber = Number(season || 0);
    const episodeNumber = Number(episode || 0);
    if (!baseUrl || !normalizedImdbId || seasonNumber <= 0 || episodeNumber <= 0) {
      return [];
    }

    const cacheKey = `${normalizedImdbId}:${seasonNumber}:${episodeNumber}`;
    if (CACHE.has(cacheKey)) {
      return CACHE.get(cacheKey);
    }

    const data = await fetchJson(
      introDbSegmentsUrl(baseUrl, {
        imdb_id: normalizedImdbId,
        season: seasonNumber,
        episode: episodeNumber
      })
    );
    const intervals = [
      toSkipInterval(data?.intro, "intro"),
      toSkipInterval(data?.recap, "recap"),
      toSkipInterval(data?.outro, "outro")
    ]
      .filter(Boolean)
      .sort((left, right) => left.startTime - right.startTime);

    CACHE.set(cacheKey, intervals);
    return intervals;
  },

  async getMovieSkipIntervals(imdbId, { tmdbId = 0 } = {}) {
    const baseUrl = normalizeBaseUrl(INTRODB_API_URL);
    const normalizedImdbId = await resolveImdbId(imdbId, tmdbId, "movie");
    if (!baseUrl || !normalizedImdbId) return [];

    const cacheKey = `movie:${normalizedImdbId}`;
    if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

    const intervals = toMovieSkipIntervals(
      await fetchJson(introDbSegmentsUrl(baseUrl, { imdb_id: normalizedImdbId, is_movie: "true" }))
    );
    CACHE.set(cacheKey, intervals);
    return intervals;
  }
};
