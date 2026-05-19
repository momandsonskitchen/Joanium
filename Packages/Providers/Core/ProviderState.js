import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';
import {
  readProviderCatalog,
  invalidateProviderCatalogCache,
} from '../../Shared/ProviderCatalog/ProviderCatalog.js';
import { backgroundSyncAllProviders } from '../../Shared/ProviderCatalog/ModelSync.js';

function isProviderConfigured(provider, details) {
  if (provider.requiresApiKey) {
    return typeof details.apiKey === 'string' && details.apiKey.length > 0;
  }

  try {
    const endpoint = typeof details.endpoint === 'string' ? details.endpoint.trim() : '';
    if (!endpoint) return false;
    new URL(endpoint);
    return true;
  } catch {
    return false;
  }
}

export function createProviderStateManager({ rootDirectory }) {
  // In-memory catalog cache — avoids re-reading 16 JSON files on every IPC call.
  // The chat:health-probe fires very frequently; without this cache it causes EMFILE.
  // Invalidated whenever provider data changes (save, remove) or after a sync writes new data.
  let catalogCache = null;

  function invalidateCatalogCache() {
    catalogCache = null;
    invalidateProviderCatalogCache();
  }

  async function getCatalogCached() {
    if (!catalogCache) {
      catalogCache = await readProviderCatalog(rootDirectory);
    }
    return catalogCache;
  }

  async function readState() {
    return readUserState(rootDirectory);
  }

  async function writeState(updater) {
    const state = await readState();
    const next = updater(state);
    return writeUserState(rootDirectory, next);
  }

  return {
    async getCatalog() {
      return getCatalogCached();
    },

    async getConfigured() {
      const [state, catalog] = await Promise.all([readState(), getCatalogCached()]);

      return catalog.map((provider) => {
        const details = state.providers.details[provider.id] ?? {};
        const isSelected = state.providers.selected.includes(provider.id);
        return {
          ...provider,
          configured: isSelected && isProviderConfigured(provider, details),
          apiKeySaved:
            isSelected && typeof details.apiKey === 'string' && details.apiKey.length > 0,
          endpointSaved:
            isSelected && typeof details.endpoint === 'string' && details.endpoint.length > 0,
          savedEndpoint: isSelected ? (details.endpoint ?? '') : '',
        };
      });
    },

    async saveProvider(providerId, incoming) {
      const catalog = await getCatalogCached();
      const provider = catalog.find((p) => p.id === providerId);

      if (!provider) {
        throw new Error('Unknown provider.');
      }

      await writeState((state) => {
        const existingDetails = state.providers.details[providerId] ?? {};
        const nextDetails = { ...existingDetails };

        if (provider.requiresApiKey) {
          if (typeof incoming.apiKey === 'string' && incoming.apiKey.trim()) {
            nextDetails.apiKey = incoming.apiKey.trim();
          }
        } else {
          if (typeof incoming.endpoint === 'string' && incoming.endpoint.trim()) {
            nextDetails.endpoint = incoming.endpoint.trim();
          }
        }

        const selected = state.providers.selected.includes(providerId)
          ? state.providers.selected
          : [...state.providers.selected, providerId];

        return {
          ...state,
          providers: {
            selected,
            details: { ...state.providers.details, [providerId]: nextDetails },
          },
        };
      });

      const updated = await this.getConfigured();
      return updated.find((p) => p.id === providerId) ?? null;
    },

    async removeProvider(providerId) {
      const state = await readState();
      const catalog = await getCatalogCached();

      const configuredIds = state.providers.selected.filter((id) => {
        const provider = catalog.find((p) => p.id === id);
        const details = state.providers.details[id] ?? {};
        return provider && isProviderConfigured(provider, details);
      });

      if (configuredIds.length <= 1 && configuredIds.includes(providerId)) {
        throw new Error('last_provider');
      }

      await writeState((state) => ({
        ...state,
        providers: {
          selected: state.providers.selected.filter((id) => id !== providerId),
          details: Object.fromEntries(
            Object.entries(state.providers.details).filter(([id]) => id !== providerId),
          ),
        },
      }));

      invalidateCatalogCache();
      return { ok: true };
    },

    /**
     * Fire-and-forget background sync of all configured providers.
     * Internally guarded: no-op when app is packaged, no-op when cache is fresh.
     * Invalidates the in-memory catalog cache after sync so next read picks up new models.
     */
    async backgroundSync() {
      const state = await readState();

      const providerCredentials = state.providers.selected
        .map((providerId) => {
          const details = state.providers.details[providerId] ?? {};
          return {
            providerId,
            credentials: {
              apiKey: details.apiKey ?? '',
              endpoint: details.endpoint ?? '',
            },
          };
        })
        .filter(({ credentials }) => credentials.apiKey || credentials.endpoint);

      if (providerCredentials.length === 0) return;

      backgroundSyncAllProviders(rootDirectory, providerCredentials)
        .then(invalidateCatalogCache)
        .catch(() => {});
    },

    invalidateCatalogCache,
  };
}
