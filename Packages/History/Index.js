import { createHistoryStateManager } from './Core/HistoryState.js';

export async function createPackage({ rootDirectory }) {
  const historyStateManager = createHistoryStateManager({ rootDirectory });

  return {
    id: 'History',
    ipcHandlers: [
      {
        channel: 'chat:save-session',
        handler: async (_event, session) => historyStateManager.saveSession(session)
      },
      {
        channel: 'chat:list-sessions',
        handler: async (_event, projectId) => historyStateManager.listSessions(projectId)
      },
      {
        channel: 'chat:load-session',
        handler: async (_event, id, projectId) => historyStateManager.loadSession(id, projectId)
      },
      {
        channel: 'chat:delete-session',
        handler: async (_event, id, projectId) => historyStateManager.deleteSession(id, projectId)
      },
      {
        channel: 'chat:rename-session',
        handler: async (_event, id, newTitle, projectId) => historyStateManager.renameSession(id, newTitle, projectId)
      },
      {
        channel: 'chat:pin-session',
        handler: async (_event, id, pinned, projectId) => historyStateManager.pinSession(id, pinned, projectId)
      }
    ]
  };
}
