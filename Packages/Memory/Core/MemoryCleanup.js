import { BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';
import { readTextResource, getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { readJsonFile, writeJsonFile } from '../../Shared/Storage/JsonFileStore.js';
import { debugLog } from '../../Shared/Debug/DebugLogger.js';
import { extractJsonObject } from '../../Shared/Utils/StringUtils.js';
import { todayDateString } from '../../Shared/Utils/DateUtils.js';

function buildCatalogText(catalog) {
  return catalog
    .filter((entry) => {
      const body = String(entry.content ?? '')
        .replace(/^#[^\n]*\n?/, '')
        .trim();
      return Boolean(body);
    })
    .map((entry) => `--- File: ${entry.filename} ---\n${entry.content}`)
    .join('\n\n');
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const filename = String(entry.filename ?? '').trim();
  const content = String(entry.content ?? '').trim();
  const summary = String(entry.summary ?? '').trim();
  return filename && content ? { filename, content, summary } : null;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function createMemoryCleanupService({
  rootDirectory,
  getMemoryCatalog,
  applyMemoryUpdates,
}) {
  let started = false;
  let running = false;
  const pendingRequests = new Map();

  // Renderer-ready gate
  let resolveRendererReady = null;
  const rendererReadyPromise = new Promise((resolve) => {
    resolveRendererReady = resolve;
  });

  function handleRendererReady() {
    debugLog('MemoryCleanup', 'Renderer gateway is ready.');
    resolveRendererReady();
  }

  function getDreamsDirectory() {
    return path.join(getWritableDataDirectory(rootDirectory), 'Dreams');
  }

  async function isDue() {
    const user = await readUserState(rootDirectory);
    if (!user.lastDreamt) return true;
    const elapsed = Date.now() - new Date(user.lastDreamt).getTime();
    return elapsed >= ONE_WEEK_MS;
  }

  function getWindow() {
    return BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null;
  }

  function requestAICompletion(prompt, modeInstruction, label) {
    return new Promise((resolve, reject) => {
      const win = getWindow();
      if (!win) {
        reject(new Error('No app window available for memory cleanup.'));
        return;
      }

      const id = randomUUID();
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error('Memory cleanup AI request timed out.'));
      }, 300_000);

      pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      debugLog('MemoryCleanup', 'Sending AI request to renderer...', { id, label });
      win.webContents.send('memory:cleanup-ai-request', {
        id,
        prompt,
        modeInstruction,
        label,
      });
    });
  }

  function handleAIResponse(id, result) {
    const pending = pendingRequests.get(id);
    if (!pending) return;
    pendingRequests.delete(id);
    if (result?.error) {
      debugLog('MemoryCleanup', 'AI response error:', result?.error);
      pending.reject(new Error(result.error));
    } else {
      debugLog('MemoryCleanup', 'AI response received.');
      pending.resolve(result);
    }
  }

  // ── Dream log persistence ──────────────────────────────────────────────

  function normalizeDreamArray(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const values = Object.values(data);
      if (
        values.length > 0 &&
        values.every((v) => v && typeof v === 'object' && 'timestamp' in v)
      ) {
        return values;
      }
    }
    return [];
  }

  async function writeDreamLog(dreamEntry) {
    const dateStr = todayDateString();
    const dreamFile = path.join(getDreamsDirectory(), dateStr, 'Dream.json');

    const existing = await readJsonFile(dreamFile, { defaultValue: [] });
    const entries = normalizeDreamArray(existing);
    entries.push(dreamEntry);
    await writeJsonFile(dreamFile, entries);
  }

  async function listDreams() {
    const dreamsDir = getDreamsDirectory();
    let dates = [];
    try {
      const entries = await readdir(dreamsDir, { withFileTypes: true });
      dates = entries
        .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
        .map((e) => e.name)
        .sort()
        .reverse();
    } catch {
      // Directory doesn't exist yet
    }
    return dates;
  }

  async function readDream(dateStr) {
    const dreamFile = path.join(getDreamsDirectory(), dateStr, 'Dream.json');
    const data = await readJsonFile(dreamFile, { defaultValue: [] });
    return normalizeDreamArray(data);
  }

  // ── Cleanup phases ──────────────────────────────────────────────────────

  function buildBeforeLookup(catalog) {
    const map = new Map();
    for (const entry of catalog) {
      map.set(entry.filename, entry.content ?? '');
    }
    return map;
  }

  async function runDeduplication(catalogText, filesScanned, catalog) {
    let dedupPrompt = '';
    try {
      dedupPrompt = await readTextResource(rootDirectory, 'Prompts', 'DeduplicateMemory.md');
    } catch (err) {
      debugLog('MemoryCleanup', 'Failed to read DeduplicateMemory.md:', err);
      return null;
    }

    if (!dedupPrompt) return null;

    const beforeLookup = buildBeforeLookup(catalog);
    dedupPrompt = dedupPrompt.replace('{memoryCatalog}', catalogText);
    const dedupRes = await requestAICompletion(
      'Please deduplicate my memories.',
      dedupPrompt,
      'Removing duplicate memories\u2026',
    );

    const dedupJsonStr = extractJsonObject(dedupRes?.text);
    if (!dedupJsonStr) {
      debugLog('MemoryCleanup', 'Dedup: AI returned no valid JSON.');
      return { type: 'deduplication', filesScanned, filesChanged: 0, changes: [] };
    }

    const dedupJson = JSON.parse(dedupJsonStr);
    const deduped = Array.isArray(dedupJson.deduped) ? dedupJson.deduped : [];
    const valid = deduped.map(normalizeEntry).filter(Boolean);

    if (valid.length > 0) {
      await applyMemoryUpdates({ updates: valid, newFiles: [] });
      debugLog('MemoryCleanup', `Deduplicated ${valid.length} memory file(s).`);
    } else {
      debugLog('MemoryCleanup', 'No duplicate memories found.');
    }

    return {
      type: 'deduplication',
      filesScanned,
      filesChanged: valid.length,
      changes: valid.map((e) => ({
        filename: e.filename,
        summary: e.summary,
        before: beforeLookup.get(e.filename) ?? '',
        after: e.content,
      })),
    };
  }

  function getNonEmptyFiles(catalog) {
    return catalog.filter((entry) => {
      const body = String(entry.content ?? '')
        .replace(/^#[^\n]*\n?/, '')
        .trim();
      return Boolean(body);
    });
  }

  // ── Main cleanup orchestrator ───────────────────────────────────────────

  async function runCleanup({ force = false } = {}) {
    if (running) {
      debugLog('MemoryCleanup', 'Skipped -- already running.');
      return;
    }

    debugLog('MemoryCleanup', 'Checking if cleanup is due...');

    if (!(await isDue())) {
      debugLog('MemoryCleanup', 'Not due yet -- skipping.');
      return;
    }

    const user = await readUserState(rootDirectory);
    if (!user.appSettings?.defaultModel) {
      debugLog('MemoryCleanup', 'Skipped -- no default model configured.');
      return;
    }

    if (!force && user.appSettings?.autoMemoryUpdates === false) {
      debugLog('MemoryCleanup', 'Skipped -- auto memory updates is disabled.');
      return;
    }

    running = true;
    debugLog('MemoryCleanup', 'Starting weekly memory cleanup...');
    debugLog('MemoryCleanup', 'Waiting for renderer gateway...');
    await rendererReadyPromise;
    debugLog('MemoryCleanup', 'Renderer ready, proceeding...');

    const dreamEntry = {
      timestamp: new Date().toISOString(),
      phases: [],
      status: 'completed',
    };

    try {
      // Phase 1: Deduplication
      debugLog('MemoryCleanup', 'Phase 1: Deduplication...');
      let catalog = await getMemoryCatalog();
      let nonEmpties = getNonEmptyFiles(catalog);

      if (nonEmpties.length < 2) {
        debugLog('MemoryCleanup', 'Skipped -- fewer than 2 non-empty memory files.');
        return;
      }

      try {
        const dedupResult = await runDeduplication(
          buildCatalogText(nonEmpties),
          nonEmpties.length,
          nonEmpties,
        );
        if (dedupResult) dreamEntry.phases.push(dedupResult);
      } catch (err) {
        debugLog('MemoryCleanup', 'Dedup phase failed:', err);
        dreamEntry.phases.push({
          type: 'deduplication',
          filesScanned: nonEmpties.length,
          filesChanged: 0,
          changes: [],
          error: err?.message ?? String(err),
        });
      }

      // Mark cleanup as done
      const freshUser = await readUserState(rootDirectory);
      await writeUserState(rootDirectory, {
        ...freshUser,
        lastDreamt: new Date().toISOString(),
      });
      console.info('[Joanium] Memory cleanup completed successfully.');
    } catch (error) {
      dreamEntry.status = 'failed';
      console.error('[MemoryCleanup] Weekly cleanup failed:', error);
    } finally {
      running = false;
      try {
        await writeDreamLog(dreamEntry);
        const win = getWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('memory:cleanup-finished');
        }
      } catch (err) {
        debugLog('MemoryCleanup', 'Failed to write dream log:', err);
      }
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      debugLog('MemoryCleanup', 'Service started.');
    },

    stop() {
      started = false;
      debugLog('MemoryCleanup', 'Service stopped.');
    },

    runCleanup,
    handleAIResponse,
    handleRendererReady,
    listDreams,
    readDream,
  };
}
