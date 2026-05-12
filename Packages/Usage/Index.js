import { createUsageTracker } from '../Shared/UsageTracker/UsageTracker.js';

export async function createPackage({ rootDirectory }) {
  const usageTracker = createUsageTracker({ rootDirectory });

  return {
    id: 'Usage',
    ipcHandlers: [
      {
        channel: 'usage:get-data',
        handler: async () => usageTracker.getUsageData(),
      },
    ],
  };
}
