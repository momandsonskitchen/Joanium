import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell } from 'electron';
import { createChatStateManager } from './Core/ChatState.js';
import { readUserState, writeUserState, mergeUserStates } from '../Shared/UserData/UserData.js';

const chatDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function createPackage({ rootDirectory }) {
  const chatStateManager    = createChatStateManager({ rootDirectory });
  const usesOverlayControls = process.platform !== 'darwin';
  const overlayOptions = {
    height: 48,
    color: '#00000000'
  };

  if (process.platform === 'win32') {
    overlayOptions.symbolColor = '#3a1450';
  }

  return {
    id: 'Chat',
    // Packages whose ipcHandlers the boot layer should merge into this window.
    // This keeps cross-package coupling out of individual package modules.
    ipcCompanions: ['History', 'Templates', 'Projects', 'Skills', 'Personas', 'Marketplace', 'Agents'],
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
        channel: 'chat:open-external',
        handler: (_event, url) => { shell.openExternal(url); return null; }
      },
      {
        channel: 'chat:save-profile',
        handler: async (_event, profile) => {
          const current = await readUserState(rootDirectory);
          const next = mergeUserStates(current, { profile });
          await writeUserState(rootDirectory, next);
          return next.profile;
        }
      },
      {
        // Fire-and-forget: returns null immediately, then pushes
        // chat:stream-chunk / chat:stream-done / chat:stream-error events
        // back to the renderer via webContents.send.
        channel: 'chat:stream-message',
        handler: (event, request) => {
          chatStateManager
            .streamMessage(request, {
              onChunk: (chunk) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('chat:stream-chunk', chunk);
                }
              },
              onDone: (meta) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('chat:stream-done', meta);
                }
              },
              onError: (error) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('chat:stream-error', {
                    message: error?.message ?? String(error)
                  });
                }
              }
            })
            .catch((error) => {
              // Safety net for unexpected throws outside the streamMessage try/catch
              if (!event.sender.isDestroyed()) {
                event.sender.send('chat:stream-error', {
                  message: error?.message ?? String(error)
                });
              }
            });

          return null; // Resolve the invoke immediately
        }
      }
    ]
  };
}
