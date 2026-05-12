import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';
import { readProviderCatalog } from '../../Shared/ProviderCatalog/ProviderCatalog.js';

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
      return readProviderCatalog(rootDirectory);
    },

    async getConfigured() {
      const [state, catalog] = await Promise.all([readState(), readProviderCatalog(rootDirectory)]);

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
      const catalog = await readProviderCatalog(rootDirectory);
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
      const catalog = await readProviderCatalog(rootDirectory);

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
      return { ok: true };
    },
  };
}
