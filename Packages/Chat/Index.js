import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatStateManager } from './Core/ChatState.js';

const chatDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function createPackage({ rootDirectory }) {
  const chatStateManager = createChatStateManager({ rootDirectory });

  return {
    id: 'Chat',
    rendererPath: path.join(chatDirectory, 'UI', 'Index.html'),
    preloadPath: path.join(chatDirectory, 'UI', 'Preload.js'),
    window: {
      title: 'Joanium'
    },
    ipcHandlers: [
      {
        channel: 'chat:bootstrap',
        handler: async () => chatStateManager.getBootstrapPayload()
      },
      {
        channel: 'chat:save-recent-prompt',
        handler: async (_event, promptEntry) => chatStateManager.saveRecentPrompt(promptEntry)
      }
    ]
  };
}
