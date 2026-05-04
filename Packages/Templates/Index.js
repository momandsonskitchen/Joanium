import { createTemplateStateManager } from './Core/TemplateState.js';

// ---------------------------------------------------------------------------
// createTemplateIpcHandlers
//
// Exported for use by any package that hosts the Chat window.
// Returns IPC handler descriptors ready to spread into a package's
// ipcHandlers array.
// ---------------------------------------------------------------------------

export function createTemplateIpcHandlers({ rootDirectory }) {
  const templateStateManager = createTemplateStateManager({ rootDirectory });

  return [
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
  ];
}
