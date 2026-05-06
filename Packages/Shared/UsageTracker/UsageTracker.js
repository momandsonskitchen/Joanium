import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

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
// Storage helpers
// ---------------------------------------------------------------------------

function getUsageFilePath(rootDirectory) {
  return path.join(rootDirectory, 'Data', 'Usage.json');
}

function todayKey() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createEmptyUsageStore() {
  return {
    // daily[YYYY-MM-DD] = { tokensIn, tokensOut, messages }
    daily:  {},
    // models[modelId]   = { tokensIn, tokensOut, messages, label, providerLabel }
    models: {},
    // running totals across all time
    totals: {
      tokensIn:  0,
      tokensOut: 0,
      messages:  0,
      sessions:  0
    }
  };
}

function sanitizeNumber(v) {
  return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

function sanitizeDailyEntry(entry) {
  if (!entry || typeof entry !== 'object') return { tokensIn: 0, tokensOut: 0, messages: 0 };
  return {
    tokensIn:  sanitizeNumber(entry.tokensIn),
    tokensOut: sanitizeNumber(entry.tokensOut),
    messages:  sanitizeNumber(entry.messages)
  };
}

function sanitizeModelEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return { tokensIn: 0, tokensOut: 0, messages: 0, label: '', providerLabel: '' };
  }
  return {
    tokensIn:      sanitizeNumber(entry.tokensIn),
    tokensOut:     sanitizeNumber(entry.tokensOut),
    messages:      sanitizeNumber(entry.messages),
    label:         typeof entry.label         === 'string' ? entry.label         : '',
    providerLabel: typeof entry.providerLabel === 'string' ? entry.providerLabel : ''
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

  if (raw?.totals && typeof raw.totals === 'object') {
    store.totals = {
      tokensIn:  sanitizeNumber(raw.totals.tokensIn),
      tokensOut: sanitizeNumber(raw.totals.tokensOut),
      messages:  sanitizeNumber(raw.totals.messages),
      sessions:  sanitizeNumber(raw.totals.sessions)
    };
  }

  return store;
}

async function readRawStore(rootDirectory) {
  const filePath = getUsageFilePath(rootDirectory);
  try {
    const contents = await readFile(filePath, 'utf8');
    if (!contents.trim()) return createEmptyUsageStore();
    return sanitizeRawStore(JSON.parse(contents));
  } catch {
    return createEmptyUsageStore();
  }
}

async function persistStore(rootDirectory, store) {
  const filePath = getUsageFilePath(rootDirectory);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createUsageTracker({ rootDirectory }) {

  /**
   * Record one completed AI exchange.
   * @param {{ tokensIn: number, tokensOut: number, modelId: string|null,
   *           modelLabel: string|null, providerLabel: string|null,
   *           isNewSession: boolean }} params
   */
  async function recordExchange({ tokensIn, tokensOut, modelId, modelLabel, providerLabel, isNewSession }) {
    const store = await readRawStore(rootDirectory);
    const day   = todayKey();

    // Daily bucket
    if (!store.daily[day]) {
      store.daily[day] = { tokensIn: 0, tokensOut: 0, messages: 0 };
    }
    store.daily[day].tokensIn  += tokensIn;
    store.daily[day].tokensOut += tokensOut;
    store.daily[day].messages  += 1;

    // Per-model bucket
    if (modelId) {
      if (!store.models[modelId]) {
        store.models[modelId] = {
          tokensIn: 0, tokensOut: 0, messages: 0,
          label:         modelLabel    ?? modelId,
          providerLabel: providerLabel ?? ''
        };
      }
      store.models[modelId].tokensIn  += tokensIn;
      store.models[modelId].tokensOut += tokensOut;
      store.models[modelId].messages  += 1;
      if (modelLabel)    store.models[modelId].label         = modelLabel;
      if (providerLabel) store.models[modelId].providerLabel = providerLabel;
    }

    // Running totals
    store.totals.tokensIn  += tokensIn;
    store.totals.tokensOut += tokensOut;
    store.totals.messages  += 1;
    if (isNewSession) store.totals.sessions += 1;

    await persistStore(rootDirectory, store);
  }

  /**
   * Return the full store for rendering.
   * @returns {Promise<object>}
   */
  async function getUsageData() {
    return readRawStore(rootDirectory);
  }

  return { recordExchange, getUsageData };
}
