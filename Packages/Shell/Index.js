import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUserState } from '../Shared/UserData/UserData.js';

const shellDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function createPackage({ rootDirectory }) {
  const usesOverlayControls = process.platform !== 'darwin';
  const overlayOptions = {
    height: 48,
    color: '#00000000'
  };

  if (process.platform === 'win32') {
    overlayOptions.symbolColor = '#3a1450';
  }

  return {
    id: 'Shell',
    ipcCompanions: [
      'Chat',
      'History',
      'Channels',
      'Events',
      'Projects',
      'Terminal',
      'Toolset',
      'Memory',
      'Templates',
      'Agents',
      'Skills',
      'Personas',
      'Marketplace',
      'Usage',
      'User',
      'AppSettings',
      'About',
      'Security',
      'Themes',
      'MCP',
      'BrowserPreview',
      'Providers'
    ],
    rendererPath: path.join(shellDirectory, 'UI', 'App.html'),
    preloadPath: path.join(shellDirectory, 'UI', 'Preload.js'),
    window: {
      title: 'Joanium',
      titleBarStyle: 'hidden',
      ...(usesOverlayControls ? { titleBarOverlay: overlayOptions } : {})
    },
    ipcHandlers: [
      {
        channel: 'shell:bootstrap',
        handler: async () => {
          const user = await readUserState(rootDirectory);
          return { user };
        }
      }
    ]
  };
}
