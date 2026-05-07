import { createProviderStateManager } from './Core/ProviderState.js';

export async function createPackage({ rootDirectory }) {
  const providerStateManager = createProviderStateManager({ rootDirectory });

  return {
    id: 'Providers',
    ipcHandlers: [
      {
        channel: 'providers:list-catalog',
        handler: async () => providerStateManager.getCatalog()
      },
      {
        channel: 'providers:list-configured',
        handler: async () => providerStateManager.getConfigured()
      },
      {
        channel: 'providers:save',
        handler: async (_event, providerId, incoming) =>
          providerStateManager.saveProvider(providerId, incoming)
      },
      {
        channel: 'providers:remove',
        handler: async (_event, providerId) =>
          providerStateManager.removeProvider(providerId)
      }
    ]
  };
}
