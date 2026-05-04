import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dialog } from 'electron';
import { createChatStateManager } from './Core/ChatState.js';

const chatDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function createPackage({ rootDirectory }) {
  const chatStateManager = createChatStateManager({ rootDirectory });
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
        channel: 'chat:save-session',
        handler: async (_event, session) => chatStateManager.saveSession(session)
      },
      {
        channel: 'chat:list-sessions',
        handler: async (_event, projectId) => chatStateManager.listSessions(projectId)
      },
      {
        channel: 'chat:load-session',
        handler: async (_event, id, projectId) => chatStateManager.loadSession(id, projectId)
      },
      {
        channel: 'chat:delete-session',
        handler: async (_event, id, projectId) => chatStateManager.deleteSession(id, projectId)
      },
      {
        channel: 'chat:rename-session',
        handler: async (_event, id, newTitle, projectId) => chatStateManager.renameSession(id, newTitle, projectId)
      },
      {
        channel: 'chat:pin-session',
        handler: async (_event, id, pinned, projectId) => chatStateManager.pinSession(id, pinned, projectId)
      },
      {
        channel: 'chat:save-project',
        handler: async (_event, project) => chatStateManager.saveProject(project)
      },
      {
        channel: 'chat:list-projects',
        handler: async () => chatStateManager.listProjects()
      },
      {
        channel: 'chat:load-project',
        handler: async (_event, id) => chatStateManager.loadProject(id)
      },
      {
        channel: 'chat:delete-project',
        handler: async (_event, id) => chatStateManager.deleteProject(id)
      },
      {
        channel: 'chat:select-project-cover',
        handler: async (event) => {
          const window = event.sender.getOwnerBrowserWindow();
          const result = await dialog.showOpenDialog(window, {
            properties: ['openFile'],
            filters: [
              {
                name: 'Images',
                extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg']
              }
            ]
          });
          return result.canceled ? null : (result.filePaths[0] ?? null);
        }
      },
      {
        channel: 'chat:select-project-directory',
        handler: async (event) => {
          const window = event.sender.getOwnerBrowserWindow();
          const result = await dialog.showOpenDialog(window, {
            properties: ['openDirectory']
          });
          return result.canceled ? null : (result.filePaths[0] ?? null);
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
