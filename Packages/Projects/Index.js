import { createProjectStateManager } from './Core/ProjectState.js';
import { readProjectDocs, formatProjectDocsPrompt } from './Core/ProjectDocReader.js';
import { pickOpenPath } from '../Shared/Electron/DialogUtils.js';

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
          return pickOpenPath(event, {
            properties: ['openFile'],
            filters: [
              {
                name: 'Images',
                extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg'],
              },
            ],
          });
        },
      },
      {
        channel: 'projects:read-project-docs',
        handler: async (_event, folderPath) => {
          const docs = await readProjectDocs(folderPath);
          return formatProjectDocsPrompt(docs);
        },
      },
      {
        channel: 'projects:select-directory',
        handler: async (event) => {
          return pickOpenPath(event, {
            properties: ['openDirectory'],
          });
        },
      },
    ],
  };
}
