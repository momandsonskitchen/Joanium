import { dialog } from 'electron';
import { createProjectStateManager } from './Core/ProjectState.js';

// ---------------------------------------------------------------------------
// Projects package — backend-only, no renderer.
// The boot layer merges its ipcHandlers into the Chat window via ipcCompanions.
// ---------------------------------------------------------------------------

export async function createPackage({ rootDirectory }) {
  const projectStateManager = createProjectStateManager({ rootDirectory });

  return {
    id: 'Projects',
    ipcHandlers: [
      {
        channel: 'chat:save-project',
        handler: async (_event, project) => projectStateManager.saveProject(project)
      },
      {
        channel: 'chat:list-projects',
        handler: async () => projectStateManager.listProjects()
      },
      {
        channel: 'chat:load-project',
        handler: async (_event, id) => projectStateManager.loadProject(id)
      },
      {
        channel: 'chat:delete-project',
        handler: async (_event, id) => projectStateManager.deleteProject(id)
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
      }
    ]
  };
}
