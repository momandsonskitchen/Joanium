import { createMarketplaceStateManager } from './Core/MarketplaceState.js';

export async function createPackage({ rootDirectory }) {
  const marketplaceStateManager = createMarketplaceStateManager({ rootDirectory });

  return {
    id: 'Marketplace',
    ipcHandlers: [
      {
        channel: 'marketplace:install-item',
        handler: async (_event, type, publisher, filename, markdown) =>
          marketplaceStateManager.installItem({ type, publisher, filename, markdown })
      }
    ]
  };
}
