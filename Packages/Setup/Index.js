import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSetupStateManager } from './Core/SetupState.js';

const setupDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function resolveLaunchPackage({ rootDirectory }) {
  const setupStateManager = createSetupStateManager({ rootDirectory });
  return setupStateManager.getLaunchPackageId();
}

export async function createPackage({ rootDirectory }) {
  const setupStateManager = createSetupStateManager({ rootDirectory });

  return {
    id: 'Setup',
    rendererPath: path.join(setupDirectory, 'UI', 'Index.html'),
    preloadPath: path.join(setupDirectory, 'UI', 'Preload.js'),
    window: {
      title: 'Joanium',
    },
    ipcHandlers: [
      {
        channel: 'setup:bootstrap',
        handler: async () => setupStateManager.getBootstrapPayload(),
      },
      {
        channel: 'setup:save-draft',
        handler: async (_event, draftState) => setupStateManager.saveDraft(draftState),
      },
      {
        channel: 'setup:complete',
        handler: async (_event, completedState) =>
          setupStateManager.completeOnboarding(completedState),
      },
      {
        channel: 'setup:import-backup',
        handler: async () => setupStateManager.importBackup(),
      },
    ],
  };
}
