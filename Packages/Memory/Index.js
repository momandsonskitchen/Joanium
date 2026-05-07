import { createMemoryStateManager } from './Core/MemoryState.js';

export async function createPackage({ rootDirectory }) {
  const memoryStateManager = createMemoryStateManager({ rootDirectory });

  return {
    id: 'Memory',
    ipcHandlers: [
      {
        channel: 'memory:list',
        handler: async () => memoryStateManager.listMemories()
      },
      {
        channel: 'memory:read',
        handler: async (_event, filename) => memoryStateManager.readMemoryFile(filename)
      },
      {
        channel: 'memory:save',
        handler: async (_event, filename, content) => memoryStateManager.saveMemory(filename, content)
      },
      {
        channel: 'memory:search',
        handler: async (_event, query, limit) => memoryStateManager.searchMemories(query, limit)
      },
      {
        channel: 'memory:get-context',
        handler: async (_event, maxChars) => memoryStateManager.getMemoryContext(maxChars)
      }
    ]
  };
}
