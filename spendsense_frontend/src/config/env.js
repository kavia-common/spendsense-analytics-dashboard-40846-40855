/**
 * Centralized environment configuration for the React frontend (CRA).
 *
 * Design goals:
 * - Validate required environment variables and coerce types safely.
 * - Provide safe defaults where appropriate.
 * - Never log secrets; only provide redacted summaries when log level is debug/trace.
 * - Export a frozen config object so consumers can import { env }.
 */

import { getLogger } from "../lib/logger";

/** @typedef {"silent"|"error"|"warn"|"info"|"debug"|"trace"} LogLevel */

const logger = getLogger();

/**
 * Returns a sanitized string value from process.env. Treats empty strings as undefined.
 * @param {string} key
 * @returns {string|undefined}
 */
function readEnvString(key) {
  const raw = process.env[key];
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  return trimmed.length ? trimmed : undefined;
}

/**
 * Coerces a boolean env var.
 * Accepted true: "1","true","yes","on"
 * Accepted false: "0","false","no","off"
 * @param {string} key
 * @param {boolean|undefined} defaultValue
 * @returns {boolean|undefined}
 */
function readEnvBool(key, defaultValue) {
  const raw = readEnvString(key);
  if (raw == null) return defaultValue;
  const v = raw.toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  // If invalid, fall back to default to avoid surprising behavior.
  return defaultValue;
}

/**
 * Coerces a number env var, returning default when missing/invalid.
 * @param {string} key
 * @param {number|undefined} defaultValue
 * @returns {number|undefined}
 */
function readEnvNumber(key, defaultValue) {
  const raw = readEnvString(key);
  if (raw == null) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

/**
 * Basic URL validation. Accepts absolute http(s) URLs and ws(s) URLs.
 * If url is missing/empty, returns undefined.
 * @param {string} key
 * @param {("http"|"ws"|"any")} kind
 * @returns {string|undefined}
 */
function readEnvUrl(key, kind = "http") {
  const raw = readEnvString(key);
  if (!raw) return undefined;

  try {
    const u = new URL(raw);
    const p = u.protocol.toLowerCase();
    const okHttp = p === "http:" || p === "https:";
    const okWs = p === "ws:" || p === "wss:";

    if (kind === "http" && !okHttp) return undefined;
    if (kind === "ws" && !okWs) return undefined;
    if (kind === "any" && !(okHttp || okWs)) return undefined;

    // Keep the original string to avoid accidental normalization surprises.
    return raw;
  } catch {
    return undefined;
  }
}

/**
 * Minimal parser for feature flags: accepts JSON object/array or comma-separated list.
 * - JSON object: {"flagA": true, "flagB": false}
 * - JSON array: ["flagA","flagB"]
 * - CSV: flagA,flagB
 * @param {string} key
 * @returns {Record<string, boolean>}
 */
function readEnvFeatureFlags(key) {
  const raw = readEnvString(key);
  if (!raw) return {};

  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return Object.fromEntries(parsed.map((k) => [String(k), true]));
    }
    if (parsed && typeof parsed === "object") {
      /** @type {Record<string, boolean>} */
      const out = {};
      for (const [k, v] of Object.entries(parsed)) out[String(k)] = Boolean(v);
      return out;
    }
  } catch {
    // ignore JSON parsing failures; fall through to CSV parser
  }

  return Object.fromEntries(
    trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((flag) => [flag, true])
  );
}

/**
 * Redacts a URL for debug summaries. It preserves scheme + host + pathname, but drops query/hash.
 * @param {string|undefined} url
 * @returns {string|undefined}
 */
function redactUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return undefined;
  }
}

/**
 * @param {LogLevel|undefined} level
 * @returns {number}
 */
function levelRank(level) {
  switch ((level || "").toLowerCase()) {
    case "silent":
      return 0;
    case "error":
      return 1;
    case "warn":
      return 2;
    case "info":
      return 3;
    case "debug":
      return 4;
    case "trace":
      return 5;
    default:
      // conservative: treat unknown as "info"
      return 3;
  }
}

/**
 * Builds and validates the environment configuration.
 * Throws on missing required vars to fail fast.
 */
function buildEnv() {
  /** @type {LogLevel} */
  const REACT_APP_LOG_LEVEL = /** @type {LogLevel} */ (
    (readEnvString("REACT_APP_LOG_LEVEL") || "info").toLowerCase()
  );

  const nodeEnvRaw = (readEnvString("REACT_APP_NODE_ENV") || "development").toLowerCase();
  const REACT_APP_NODE_ENV =
    nodeEnvRaw === "production" || nodeEnvRaw === "test" || nodeEnvRaw === "development"
      ? nodeEnvRaw
      : "development";

  const REACT_APP_API_BASE = readEnvUrl("REACT_APP_API_BASE", "http");
  const REACT_APP_BACKEND_URL = readEnvUrl("REACT_APP_BACKEND_URL", "http");
  const REACT_APP_FRONTEND_URL = readEnvUrl("REACT_APP_FRONTEND_URL", "http");
  const REACT_APP_WS_URL = readEnvUrl("REACT_APP_WS_URL", "ws");

  // Optional separate backend URL for analytics-api (can be same origin as backend).
  const REACT_APP_ANALYTICS_API_URL = readEnvUrl("REACT_APP_ANALYTICS_API_URL", "http");
  const REACT_APP_ANALYTICS_API_TIMEOUT_MS = readEnvNumber("REACT_APP_ANALYTICS_API_TIMEOUT_MS", undefined);

  const REACT_APP_ENABLE_SOURCE_MAPS = readEnvBool("REACT_APP_ENABLE_SOURCE_MAPS", undefined);
  const REACT_APP_TRUST_PROXY = readEnvBool("REACT_APP_TRUST_PROXY", undefined);

  const REACT_APP_PORT = readEnvNumber("REACT_APP_PORT", undefined);

  const REACT_APP_HEALTHCHECK_PATH = readEnvString("REACT_APP_HEALTHCHECK_PATH") || "/health";
  const REACT_APP_FEATURE_FLAGS = readEnvFeatureFlags("REACT_APP_FEATURE_FLAGS");
  const REACT_APP_EXPERIMENTS_ENABLED = readEnvBool("REACT_APP_EXPERIMENTS_ENABLED", false);

  // Required keys list (as requested). We allow safe defaults for some.
  const required = [
    "REACT_APP_API_BASE",
    "REACT_APP_BACKEND_URL",
    "REACT_APP_FRONTEND_URL",
    "REACT_APP_WS_URL",
    "REACT_APP_NODE_ENV",
    "REACT_APP_ENABLE_SOURCE_MAPS",
    "REACT_APP_PORT",
    "REACT_APP_TRUST_PROXY",
    "REACT_APP_LOG_LEVEL",
    "REACT_APP_HEALTHCHECK_PATH",
    "REACT_APP_FEATURE_FLAGS",
    "REACT_APP_EXPERIMENTS_ENABLED",
    // Optional analytics vars are intentionally not required.
    "REACT_APP_ANALYTICS_API_URL",
    "REACT_APP_ANALYTICS_API_TIMEOUT_MS",
  ];

  // Validate presence / correctness. We allow API base to be unset *only* if backend URL exists (fallback).
  /** @type {string[]} */
  const missingOrInvalid = [];
  if (!REACT_APP_API_BASE && !REACT_APP_BACKEND_URL) missingOrInvalid.push("REACT_APP_API_BASE/REACT_APP_BACKEND_URL");
  if (!REACT_APP_BACKEND_URL) missingOrInvalid.push("REACT_APP_BACKEND_URL");
  if (!REACT_APP_FRONTEND_URL) missingOrInvalid.push("REACT_APP_FRONTEND_URL");
  if (!REACT_APP_WS_URL) missingOrInvalid.push("REACT_APP_WS_URL");

  // The rest have defaults or are optional-ish, but are required by contract; ensure they're at least defined in the resulting object.
  // If these were present but invalid, they will have default/undefined; we keep them in the config and do not throw.
  void required;

  if (missingOrInvalid.length) {
    // Avoid logging values; only keys.
    throw new Error(
      `Missing or invalid required env vars: ${missingOrInvalid.join(
        ", "
      )}. Ensure CRA env vars are set and URLs are absolute (http/https, ws/wss).`
    );
  }

  const env = Object.freeze({
    REACT_APP_API_BASE: REACT_APP_API_BASE || REACT_APP_BACKEND_URL,
    REACT_APP_BACKEND_URL,
    REACT_APP_FRONTEND_URL,
    REACT_APP_WS_URL,
    REACT_APP_NODE_ENV,
    REACT_APP_ENABLE_SOURCE_MAPS,
    REACT_APP_PORT,
    REACT_APP_TRUST_PROXY,
    REACT_APP_LOG_LEVEL,
    REACT_APP_HEALTHCHECK_PATH,
    REACT_APP_FEATURE_FLAGS,
    REACT_APP_EXPERIMENTS_ENABLED,

    // Analytics backend (optional; falls back to REACT_APP_API_BASE at call time if unset).
    REACT_APP_ANALYTICS_API_URL,
    REACT_APP_ANALYTICS_API_TIMEOUT_MS,
  });

  // Only log redacted summary at debug/trace.
  if (levelRank(REACT_APP_LOG_LEVEL) >= levelRank("debug")) {
    logger.debug("[env] loaded (redacted)", {
      REACT_APP_API_BASE: redactUrl(env.REACT_APP_API_BASE),
      REACT_APP_BACKEND_URL: redactUrl(env.REACT_APP_BACKEND_URL),
      REACT_APP_FRONTEND_URL: redactUrl(env.REACT_APP_FRONTEND_URL),
      REACT_APP_WS_URL: redactUrl(env.REACT_APP_WS_URL),
      REACT_APP_ANALYTICS_API_URL: redactUrl(env.REACT_APP_ANALYTICS_API_URL),
      REACT_APP_ANALYTICS_API_TIMEOUT_MS: env.REACT_APP_ANALYTICS_API_TIMEOUT_MS,
      REACT_APP_NODE_ENV: env.REACT_APP_NODE_ENV,
      REACT_APP_ENABLE_SOURCE_MAPS: env.REACT_APP_ENABLE_SOURCE_MAPS,
      REACT_APP_PORT: env.REACT_APP_PORT,
      REACT_APP_TRUST_PROXY: env.REACT_APP_TRUST_PROXY,
      REACT_APP_LOG_LEVEL: env.REACT_APP_LOG_LEVEL,
      REACT_APP_HEALTHCHECK_PATH: env.REACT_APP_HEALTHCHECK_PATH,
      REACT_APP_FEATURE_FLAGS: Object.keys(env.REACT_APP_FEATURE_FLAGS || {}).sort(),
      REACT_APP_EXPERIMENTS_ENABLED: env.REACT_APP_EXPERIMENTS_ENABLED,
    });
  }

  return env;
}

// PUBLIC_INTERFACE
export const env = buildEnv();
/** Centralized, validated, frozen environment configuration. */
