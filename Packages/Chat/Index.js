import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell } from 'electron';
import { createChatStateManager } from './Core/ChatState.js';
import { createSkillsStateManager } from './Core/SkillsState.js';
import { createPersonasStateManager } from './Core/PersonasState.js';
import { readUserState, writeUserState, mergeUserStates } from '../Shared/UserData/UserData.js';

const chatDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function createPackage({ rootDirectory }) {
  const chatStateManager     = createChatStateManager({ rootDirectory });
  const skillsStateManager   = createSkillsStateManager({ rootDirectory });
  const personasStateManager = createPersonasStateManager({ rootDirectory });
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
    ipcCompanions: ['Templates', 'Projects'],
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
        channel: 'chat:list-skills',
        handler: async () => skillsStateManager.listSkills()
      },
      {
        channel: 'chat:load-skill',
        handler: async (_event, namespace, filename) => skillsStateManager.loadSkill(namespace, filename)
      },
      {
        channel: 'chat:delete-skill',
        handler: async (_event, namespace, filename) => skillsStateManager.deleteSkill(namespace, filename)
      },
      {
        channel: 'chat:list-personas',
        handler: async () => personasStateManager.listPersonas()
      },
      {
        channel: 'chat:load-persona',
        handler: async (_event, namespace, filename) => personasStateManager.loadPersona(namespace, filename)
      },
      {
        channel: 'chat:delete-persona',
        handler: async (_event, namespace, filename) => personasStateManager.deletePersona(namespace, filename)
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
