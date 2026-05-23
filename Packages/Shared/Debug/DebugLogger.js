import path from 'node:path';
import { appendFileSync, mkdirSync } from 'node:fs';

let configured = false;
let logFilePath = null;

function normalizeFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase(),
  );
}

function sanitizeDebugValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeDebugValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (
        /api[-_]?key|authorization|client[-_]?secret|password|refresh[-_]?token|token/i.test(key)
      ) {
        return [key, '[redacted]'];
      }

      return [key, sanitizeDebugValue(entry)];
    }),
  );
}

function stringifyDetails(details) {
  if (details === undefined || details === null || details === '') {
    return '';
  }

  if (typeof details === 'string') {
    return details;
  }

  try {
    return JSON.stringify(sanitizeDebugValue(details), null, 2);
  } catch {
    return String(details);
  }
}

export function isDebugMode() {
  if (typeof process === 'undefined') return false;

  return (
    process.argv.includes('--debug') ||
    process.argv.includes('--joanium-debug') ||
    normalizeFlag(process.env.JOANIUM_DEBUG) ||
    normalizeFlag(process.env.npm_config_debug) ||
    normalizeFlag(process.env.npm_config_joanium_debug)
  );
}

export function configureDebugLogger({ rootDirectory } = {}) {
  if (!isDebugMode()) {
    return false;
  }

  configured = true;

  if (rootDirectory) {
    logFilePath = path.join(rootDirectory, 'Build', 'Logs', 'debug.log');
  }

  debugLog('Debug', 'Debug mode enabled', {
    argv: process.argv,
    node: process.version,
    platform: process.platform,
    pid: process.pid,
  });

  return true;
}

export function debugLog(scope, message, details = null) {
  if (!configured && !isDebugMode()) {
    return;
  }

  const detailText = stringifyDetails(details);
  const line = `[${new Date().toISOString()}] [${scope}] ${message}`;
  const output = detailText ? `${line}\n${detailText}` : line;

  console.log(output);

  if (!logFilePath) {
    return;
  }

  try {
    mkdirSync(path.dirname(logFilePath), { recursive: true });
    appendFileSync(logFilePath, `${output}\n`, 'utf8');
  } catch {
    // Debug logging must never affect app startup or runtime behavior.
  }
}
