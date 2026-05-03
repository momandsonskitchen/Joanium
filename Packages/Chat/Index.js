import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatStateManager } from './Core/ChatState.js';

const chatDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function createPackage({ rootDirectory }) {
  const chatStateManager = createChatStateManager({ rootDirectory });
  const usesOverlayControls = process.platform !== 'darwin';
  const overlayOptions = {
    height: 48,
    color: '#f8f4ef'
  };

  if (process.platform === 'win32') {
    overlayOptions.symbolColor = '#4d3c2d';
  }

  return {
    id: 'Chat',
    rendererPath: path.join(chatDirectory, 'UI', 'Index.html'),
    preloadPath: path.join(chatDirectory, 'UI', 'Preload.js'),
    window: {
      title: 'Joanium',
      titleBarStyle: 'hidden',
      ...(usesOverlayControls
        ? {
            titleBarOverlay: overlayOptions
          }
        : {})
    },
    ipcHandlers: [
      {
        channel: 'chat:bootstrap',
        handler: async () => chatStateManager.getBootstrapPayload()
      },
      {
        channel: 'chat:save-recent-prompt',
        handler: async (_event, promptEntry) => chatStateManager.saveRecentPrompt(promptEntry)
      },
      {
        channel: 'chat:send-message',
        handler: async (_event, request) => chatStateManager.sendMessage(request)
      }
    ]
  };
}
