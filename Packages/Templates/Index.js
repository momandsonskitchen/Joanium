import { createTemplateStateManager } from './Core/TemplateState.js';

// ---------------------------------------------------------------------------
// createPackage — standard package contract (backend-only, no renderer).
// The Shell package composes these IPC handlers into the app window.
// ---------------------------------------------------------------------------

export async function createPackage({ rootDirectory }) {
  const templateStateManager = createTemplateStateManager({ rootDirectory });

  return {
    id: 'Templates',
    ipcHandlers: [
      {
        channel: 'templates:save-template',
        handler: async (_event, template) => templateStateManager.saveTemplate(template),
      },
      {
        channel: 'templates:list-templates',
        handler: async () => templateStateManager.listTemplates(),
      },
      {
        channel: 'templates:load-template',
        handler: async (_event, id) => templateStateManager.loadTemplate(id),
      },
      {
        channel: 'templates:delete-template',
        handler: async (_event, id) => templateStateManager.deleteTemplate(id),
      },
    ],
  };
}
