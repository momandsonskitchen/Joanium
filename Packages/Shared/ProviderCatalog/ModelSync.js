/**
 * ModelSync.js
 *
 * Keeps Config/Models/<Provider>/<Provider>.json files up to date by fetching
 * the live model list from each provider's API and merging the result in-place.
 *
 * Rules:
 *  - Only runs when the app is NOT packaged (dev mode only).
 *    In packaged builds, the asar bundle is read-only and the JSON files bundled
 *    at build time are always used as-is.
 *  - Staleness is tracked via a top-level `_syncedAt` field inside each JSON.
 *  - Cache is considered fresh for 24 hours.
 *  - Failures are silently swallowed — never crash over model sync.
 *  - Merge strategy:
 *      Known models  → keep all curated metadata (description, pricing, context, etc.)
 *      New models    → add with whatever metadata the API returned
 *      Removed models → dropped from the file
 */

import path from 'node:path';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { app } from 'electron';
import { fetchProviderModels } from './ModelFetcher.js';
import { getResourcePath, readJsonResource } from '../Storage/ResourcePaths.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const SYNC_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSyncStale(providerConfig) {
  if (!providerConfig._syncedAt) return true;
  return Date.now() - new Date(providerConfig._syncedAt).getTime() > SYNC_TTL_MS;
}

/**
 * Merge live API models into the existing keyed models object.
 *
 * - Known models: keep all curated JSON metadata unchanged.
 * - New models:   add with whatever the API returned (name, context_window, pricing, etc.).
 * - Gone models:  removed (not in liveModels → not in result).
 */
function mergeModels(existingModels, liveModels) {
  const merged = {};
  for (const { id, name, ...apiMeta } of liveModels) {
    if (existingModels[id]) {
      merged[id] = existingModels[id];
    } else {
      merged[id] = Object.keys(apiMeta).length > 0 ? { name, ...apiMeta } : { name };
    }
  }
  return merged;
}

/** Resolve the JSON file path for a given providerId from the index. */
async function resolveProviderJsonPath(rootDirectory, providerId) {
  const providerFiles = await readJsonResource(rootDirectory, 'Config', 'Models', 'index.json');

  const fileName = providerFiles.find(
    (f) => path.basename(f, '.json').toLowerCase() === providerId.toLowerCase(),
  );
  if (!fileName) return null;

  const providerName = path.basename(fileName, '.json');
  return getResourcePath(rootDirectory, 'Config', 'Models', providerName, fileName);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Force-sync a single provider's model list into its Config/Models JSON file.
 * No-op when the app is packaged. Never throws.
 */
export async function syncProvider(rootDirectory, providerId, credentials) {
  if (app.isPackaged) return;

  try {
    const jsonPath = await resolveProviderJsonPath(rootDirectory, providerId);
    if (!jsonPath) return;

    const existing = JSON.parse(await readFile(jsonPath, 'utf8'));
    const liveModels = await fetchProviderModels(providerId, credentials);

    if (!Array.isArray(liveModels) || liveModels.length === 0) return;

    const mergedModels = mergeModels(existing.models ?? {}, liveModels);

    const updated = {
      ...existing,
      models: mergedModels,
      _syncedAt: new Date().toISOString(),
    };

    const tmp = `${jsonPath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    await rename(tmp, jsonPath);
  } catch {
    // Silently ignore — never crash the app over model sync
  }
}

/**
 * Background-sync every provider whose JSON is stale (> 24 h).
 * Fire-and-forget. No-op when the app is packaged. Never throws.
 *
 * @param {string} rootDirectory
 * @param {Array<{ providerId: string, credentials: { apiKey?: string, endpoint?: string } }>} providerCredentials
 */
export async function backgroundSyncAllProviders(rootDirectory, providerCredentials) {
  if (app.isPackaged) return;

  // Process sequentially — avoids opening all provider files concurrently (EMFILE risk).
  for (const { providerId, credentials } of providerCredentials) {
    try {
      const jsonPath = await resolveProviderJsonPath(rootDirectory, providerId);
      if (!jsonPath) continue;

      const existing = JSON.parse(await readFile(jsonPath, 'utf8'));
      if (!isSyncStale(existing)) continue;

      await syncProvider(rootDirectory, providerId, credentials);
    } catch {
      // Silently ignore
    }
  }
}
