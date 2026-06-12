import electron from 'electron';
import { createAboutStateManager } from './Core/AboutState.js';

const { shell } = electron;

export async function createPackage({ rootDirectory }) {
  const aboutStateManager = createAboutStateManager({ rootDirectory });

  return {
    id: 'About',
    ipcHandlers: [
      {
        channel: 'about:get-info',
        handler: async () => aboutStateManager.getInfo(),
      },
      {
        channel: 'about:open-external',
        handler: (_event, url) => {
          if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
            throw new Error('A valid external URL is required.');
          }

          shell.openExternal(url);
          return null;
        },
      },
      {
        channel: 'whats-new:get',
        handler: async () => aboutStateManager.getWhatsNew(),
      },
      {
        channel: 'whats-new:mark-seen',
        handler: async (_event, version) => aboutStateManager.markWhatsNewSeen(version),
      },
    ],
  };
}
