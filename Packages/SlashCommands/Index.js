import { createSlashRegistry } from './Core/SlashRegistry.js';

export async function createPackage({ rootDirectory } = {}) {
  const registry = createSlashRegistry(rootDirectory);

  return {
    id: 'SlashCommands',
    ipcHandlers: [
      {
        channel: 'slash-commands:list',
        handler: async () => registry.listCommands(),
      },
      {
        channel: 'slash-commands:get-mode-instruction',
        handler: async (_event, modeId) => registry.getModeInstruction(modeId),
      },
    ],
  };
}
