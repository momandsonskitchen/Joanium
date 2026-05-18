import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUserState } from '../Shared/UserData/UserData.js';

const shellDirectory = path.dirname(fileURLToPath(import.meta.url));
const NON_SHELL_COMPANION_IDS = new Set([
  'Boot',
  'Electron',
  'LiveBrowser',
  'Setup',
  'Shared',
  'Shell',
]);

function resolveShellCompanions(registry) {
  if (!registry || !(registry instanceof Map)) {
    return [];
  }

  return [...registry.keys()]
    .filter((packageId) => !NON_SHELL_COMPANION_IDS.has(packageId))
    .sort((left, right) => left.localeCompare(right));
}

export async function createPackage({ rootDirectory, registry }) {
  const usesOverlayControls = process.platform !== 'darwin';
  const overlayOptions = {
    height: 48,
    color: '#00000000',
  };

  if (process.platform === 'win32') {
    overlayOptions.symbolColor = '#3a1450';
  }

  return {
    id: 'Shell',
    ipcCompanions: resolveShellCompanions(registry),
    rendererPath: path.join(shellDirectory, 'UI', 'App.html'),
    preloadPath: path.join(shellDirectory, 'UI', 'Preload.js'),
    window: {
      title: 'Joanium',
      titleBarStyle: 'hidden',
      ...(usesOverlayControls ? { titleBarOverlay: overlayOptions } : {}),
    },
    ipcHandlers: [
      {
        channel: 'shell:bootstrap',
        handler: async () => {
          const user = await readUserState(rootDirectory);
          return { user };
        },
      },
    ],
  };
}
