import { createHistoryStateManager } from './Core/HistoryState.js';

export async function createPackage({ rootDirectory }) {
  const historyStateManager = createHistoryStateManager({ rootDirectory });

  return {
    id: 'History',
    ipcHandlers: [
      {
        channel: 'history:save-session',
        handler: async (_event, session) => historyStateManager.saveSession(session)
      },
      {
        channel: 'history:list-sessions',
        handler: async (_event, projectId) => historyStateManager.listSessions(projectId)
      },
      {
        channel: 'history:load-session',
        handler: async (_event, id, projectId) => historyStateManager.loadSession(id, projectId)
      },
      {
        channel: 'history:delete-session',
        handler: async (_event, id, projectId) => historyStateManager.deleteSession(id, projectId)
      },
      {
        channel: 'history:rename-session',
        handler: async (_event, id, newTitle, projectId) => historyStateManager.renameSession(id, newTitle, projectId)
      },
      {
        channel: 'history:pin-session',
        handler: async (_event, id, pinned, projectId) => historyStateManager.pinSession(id, pinned, projectId)
      }
    ]
  };
}
