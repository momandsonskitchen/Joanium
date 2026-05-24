/**
 * LiveModelFilter.js
 *
 * Fetches the live model list from each provider API in memory and filters
 * the bundled provider catalog down to only models that are currently active.
 *
 * Design rules:
 *  - One HTTP request per provider, not one per model.
 *  - Results are cached in memory for 1 hour (no disk writes).
 *  - If a provider fetch fails or returns null (no listing API), all its
 *    bundled models are kept — fail-safe, never removes too aggressively.
 *  - Concurrent calls for the same provider share a single in-flight fetch.
 *  - Intended for packaged builds only; dev mode uses ModelSync instead
 *    (which writes filtered results back to Config/Models JSON files).
 */

import { fetchProviderModels } from './ModelFetcher.js';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createLiveModelFilter() {
  // Map<providerId, { ids: Set<string>, cachedAt: number }>
  const cache = new Map();

  // Map<providerId, Promise<Set<string> | null>> — deduplicates concurrent fetches.
  const pending = new Map();

  async function fetchLiveIds(providerId, credentials) {
    // Return cached result if still fresh.
    const cached = cache.get(providerId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.ids;
    }

    // Reuse an in-flight fetch for the same provider.
    if (pending.has(providerId)) {
      return pending.get(providerId);
    }

    const promise = fetchProviderModels(providerId, credentials)
      .then((models) => {
        if (!Array.isArray(models) || models.length === 0) return null;
        const ids = new Set(models.map((m) => m.id));
        cache.set(providerId, { ids, cachedAt: Date.now() });
        return ids;
      })
      .catch(() => null) // fail-safe: keep all models on error
      .finally(() => pending.delete(providerId));

    pending.set(providerId, promise);
    return promise;
  }

  return {
    /**
     * Returns a new providers array where each provider's model list is
     * filtered to only models present in the provider's live API response.
     * Providers whose API doesn't support listing (null) or whose fetch fails
     * are returned unchanged.
     *
     * @param {Array} providers   - Full provider catalog from readProviderCatalog()
     * @param {object} user       - User state (for API keys / custom endpoints)
     * @returns {Promise<Array>}  - Filtered providers (same shape, fewer models)
     */
    async filterProviders(providers, user) {
      const userDetails = user?.providers?.details ?? {};

      const results = await Promise.all(
        providers.map(async (provider) => {
          const details = userDetails[provider.id] ?? {};
          const apiKey = (details.apiKey ?? '').trim();
          const endpoint = (details.endpoint ?? '').trim() || (provider.endpoint ?? '').trim();

          // Skip providers the user hasn't configured — nothing to filter against.
          if (provider.requiresApiKey && !apiKey) return provider;
          if (!endpoint && !provider.requiresApiKey) return provider;

          const credentials = { apiKey, endpoint };
          const liveIds = await fetchLiveIds(provider.id, credentials);

          // No live list available — return provider unchanged (fail-safe).
          if (!liveIds) return provider;

          const filteredModels = (provider.models ?? []).filter((m) => liveIds.has(m.id));

          // If filtering removed everything, keep original list — probably a
          // mismatch in ID format rather than all models being gone.
          if (filteredModels.length === 0) return provider;

          return { ...provider, models: filteredModels };
        }),
      );

      return results;
    },
  };
}
