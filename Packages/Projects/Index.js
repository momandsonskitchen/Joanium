import { dialog } from 'electron';
import { createProjectStateManager } from './Core/ProjectState.js';

// ---------------------------------------------------------------------------
// Projects package — backend-only, no renderer.
// The Shell package composes these IPC handlers into the app window.
// ---------------------------------------------------------------------------

export async function createPackage({ rootDirectory }) {
  const projectStateManager = createProjectStateManager({ rootDirectory });

  return {
    id: 'Projects',
    ipcHandlers: [
      {
        channel: 'projects:save-project',
        handler: async (_event, project) => projectStateManager.saveProject(project),
      },
      {
        channel: 'projects:list-projects',
        handler: async () => projectStateManager.listProjects(),
      },
      {
        channel: 'projects:load-project',
        handler: async (_event, id) => projectStateManager.loadProject(id),
      },
      {
        channel: 'projects:delete-project',
        handler: async (_event, id) => projectStateManager.deleteProject(id),
      },
      {
        channel: 'projects:select-cover',
        handler: async (event) => {
          const window = event.sender.getOwnerBrowserWindow();
          const result = await dialog.showOpenDialog(window, {
            properties: ['openFile'],
            filters: [
              {
                name: 'Images',
                extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg'],
              },
            ],
          });
          return result.canceled ? null : (result.filePaths[0] ?? null);
        },
      },
      {
        channel: 'projects:select-directory',
        handler: async (event) => {
          const window = event.sender.getOwnerBrowserWindow();
          const result = await dialog.showOpenDialog(window, {
            properties: ['openDirectory'],
          });
          return result.canceled ? null : (result.filePaths[0] ?? null);
        },
      },
    ],
  };
}
