import { createTemplateStateManager } from './Core/TemplateState.js';

// ---------------------------------------------------------------------------
// createPackage — standard package contract (backend-only, no renderer).
// The boot layer loads this alongside the Chat package and merges its
// ipcHandlers so neither Chat nor Templates know about each other.
// ---------------------------------------------------------------------------

export async function createPackage({ rootDirectory }) {
  const templateStateManager = createTemplateStateManager({ rootDirectory });

  return {
    id: 'Templates',
    ipcHandlers: [
      {
        channel: 'chat:save-template',
        handler: async (_event, template) => templateStateManager.saveTemplate(template)
      },
      {
        channel: 'chat:list-templates',
        handler: async () => templateStateManager.listTemplates()
      },
      {
        channel: 'chat:load-template',
        handler: async (_event, id) => templateStateManager.loadTemplate(id)
      },
      {
        channel: 'chat:delete-template',
        handler: async (_event, id) => templateStateManager.deleteTemplate(id)
      }
    ]
  };
}
