import { createToolsetService } from './Core/ToolsetService.js';

export async function createPackage() {
  const toolsetService = createToolsetService();

  return {
    id: 'Toolset',
    ipcHandlers: [
      {
        channel: 'toolset:list-tools',
        handler: async () => toolsetService.listTools()
      },
      {
        channel: 'toolset:execute-tool',
        handler: async (_event, payload) => toolsetService.executeTool(payload)
      }
    ]
  };
}
