import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { getWritableDataDirectory } from '../Storage/ResourcePaths.js';
import {
  readJsonFile as readJsonFileShared,
  writeJsonFile as writeJsonFileShared,
} from '../Storage/JsonFileStore.js';

// ---------------------------------------------------------------------------
// Token estimation
// ~4 characters per token — consistent and good enough for tracking relative
// usage across models and days without a full tokenizer.
// ---------------------------------------------------------------------------

export function estimateTokens(charCount) {
  if (!charCount || charCount <= 0) return 0;
  return Math.max(1, Math.round(charCount / 4));
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function getUsageDir(rootDirectory) {
  return path.join(getWritableDataDirectory(rootDirectory), 'Usage');
}

// Data/Usage/{year}/{MM}/Daily.json
function getMonthDailyFilePath(rootDirectory, year, month) {
  return path.join(
    getUsageDir(rootDirectory),
    String(year),
    String(month).padStart(2, '0'),
    'Daily.json',
  );
}

function getModelsFilePath(rootDirectory) {
  return path.join(getUsageDir(rootDirectory), 'Models.json');
}

function getTotalsFilePath(rootDirectory) {
  return path.join(getUsageDir(rootDirectory), 'Totals.json');
}

function todayParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    key: [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-'),
  };
}

export function createEmptyUsageStore() {
  return {
    // daily[YYYY-MM-DD] = { tokensIn, tokensOut, messages }
    daily: {},
    // models[modelId]   = { tokensIn, tokensOut, messages, label, providerLabel, providerIconPath }
    models: {},
    // running totals across all time
    totals: {
      tokensIn: 0,
      tokensOut: 0,
      messages: 0,
      sessions: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------

function sanitizeNumber(v) {
  return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

function sanitizeDailyEntry(entry) {
  if (!entry || typeof entry !== 'object') return { tokensIn: 0, tokensOut: 0, messages: 0 };
  return {
    tokensIn: sanitizeNumber(entry.tokensIn),
    tokensOut: sanitizeNumber(entry.tokensOut),
    messages: sanitizeNumber(entry.messages),
  };
}

function sanitizeModelEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return {
      tokensIn: 0,
      tokensOut: 0,
      messages: 0,
      label: '',
      providerLabel: '',
      providerIconPath: null,
    };
  }
  return {
    tokensIn: sanitizeNumber(entry.tokensIn),
    tokensOut: sanitizeNumber(entry.tokensOut),
    messages: sanitizeNumber(entry.messages),
    label: typeof entry.label === 'string' ? entry.label : '',
    providerLabel: typeof entry.providerLabel === 'string' ? entry.providerLabel : '',
    providerIconPath: typeof entry.providerIconPath === 'string' ? entry.providerIconPath : null,
  };
}

function sanitizeTotals(raw) {
  if (!raw || typeof raw !== 'object')
    return { tokensIn: 0, tokensOut: 0, messages: 0, sessions: 0 };
  return {
    tokensIn: sanitizeNumber(raw.tokensIn),
    tokensOut: sanitizeNumber(raw.tokensOut),
    messages: sanitizeNumber(raw.messages),
    sessions: sanitizeNumber(raw.sessions),
  };
}

function sanitizeRawStore(raw) {
  const store = createEmptyUsageStore();

  if (raw?.daily && typeof raw.daily === 'object') {
    for (const [key, value] of Object.entries(raw.daily)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        store.daily[key] = sanitizeDailyEntry(value);
      }
    }
  }

  if (raw?.models && typeof raw.models === 'object') {
    for (const [key, value] of Object.entries(raw.models)) {
      if (key) store.models[key] = sanitizeModelEntry(value);
    }
  }

  store.totals = sanitizeTotals(raw?.totals);

  return store;
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

const readJsonFile = readJsonFileShared;
const writeJsonFile = writeJsonFileShared;

// ---------------------------------------------------------------------------
// Read all monthly Daily.json files across the year/month tree.
// Data/Usage/{year}/{MM}/Daily.json
// ---------------------------------------------------------------------------

async function readAllMonthlyDailyFiles(rootDirectory) {
  const usageDir = getUsageDir(rootDirectory);
  const daily = {};

  let yearEntries;
  try {
    yearEntries = await readdir(usageDir, { withFileTypes: true });
  } catch {
    return daily;
  }

  await Promise.all(
    yearEntries
      .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
      .map(async (yearEntry) => {
        const yearDir = path.join(usageDir, yearEntry.name);
        let monthEntries;
        try {
          monthEntries = await readdir(yearDir, { withFileTypes: true });
        } catch {
          return;
        }
        await Promise.all(
          monthEntries
            .filter((e) => e.isDirectory() && /^\d{2}$/.test(e.name))
            .map(async (monthEntry) => {
              const data = await readJsonFile(path.join(yearDir, monthEntry.name, 'Daily.json'));
              if (data && typeof data === 'object') {
                Object.assign(daily, data);
              }
            }),
        );
      }),
  );

  return daily;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createUsageTracker({ rootDirectory }) {
  /**
   * Record one completed AI exchange.
   * Only reads/writes the current month's Daily.json — never touches other months.
   */
  async function recordExchange({
    tokensIn,
    tokensOut,
    modelId,
    modelLabel,
    providerLabel,
    providerIconPath,
    isNewSession,
  }) {
    const { year, month, key: day } = todayParts();
    const monthFilePath = getMonthDailyFilePath(rootDirectory, year, month);

    const [monthDailyRaw, modelsRaw, totalsRaw] = await Promise.all([
      readJsonFile(monthFilePath),
      readJsonFile(getModelsFilePath(rootDirectory)),
      readJsonFile(getTotalsFilePath(rootDirectory)),
    ]);

    // Daily bucket (current month only)
    const monthDaily =
      monthDailyRaw && typeof monthDailyRaw === 'object' ? { ...monthDailyRaw } : {};
    if (!monthDaily[day]) monthDaily[day] = { tokensIn: 0, tokensOut: 0, messages: 0 };
    monthDaily[day].tokensIn += tokensIn;
    monthDaily[day].tokensOut += tokensOut;
    monthDaily[day].messages += 1;

    // Models
    const models = {};
    if (modelsRaw?.models && typeof modelsRaw.models === 'object') {
      for (const [k, v] of Object.entries(modelsRaw.models)) {
        if (k) models[k] = sanitizeModelEntry(v);
      }
    }
    if (modelId) {
      if (!models[modelId]) {
        models[modelId] = {
          tokensIn: 0,
          tokensOut: 0,
          messages: 0,
          label: modelLabel ?? modelId,
          providerLabel: providerLabel ?? '',
          providerIconPath: providerIconPath ?? null,
        };
      }
      models[modelId].tokensIn += tokensIn;
      models[modelId].tokensOut += tokensOut;
      models[modelId].messages += 1;
      if (modelLabel) models[modelId].label = modelLabel;
      if (providerLabel) models[modelId].providerLabel = providerLabel;
      if (providerIconPath) models[modelId].providerIconPath = providerIconPath;
    }

    // Totals
    const totals = sanitizeTotals(totalsRaw);
    totals.tokensIn += tokensIn;
    totals.tokensOut += tokensOut;
    totals.messages += 1;
    if (isNewSession) totals.sessions += 1;

    await Promise.all([
      writeJsonFile(monthFilePath, monthDaily),
      writeJsonFile(getModelsFilePath(rootDirectory), { models }),
      writeJsonFile(getTotalsFilePath(rootDirectory), totals),
    ]);
  }

  /**
   * Return the full store for rendering.
   * Scans all year/month Daily.json files in parallel.
   */
  async function getUsageData() {
    const [allDaily, modelsRaw, totalsRaw] = await Promise.all([
      readAllMonthlyDailyFiles(rootDirectory),
      readJsonFile(getModelsFilePath(rootDirectory)),
      readJsonFile(getTotalsFilePath(rootDirectory)),
    ]);

    return sanitizeRawStore({
      daily: allDaily,
      models: modelsRaw?.models ?? {},
      totals: totalsRaw ?? {},
    });
  }

  return { recordExchange, getUsageData };
}
