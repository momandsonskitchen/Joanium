import { createMemoryStateManager } from './Core/MemoryState.js';
import { createMemoryCleanupService } from './Core/MemoryCleanup.js';

export async function createPackage({ rootDirectory }) {
  const memoryStateManager = createMemoryStateManager({ rootDirectory });

  const cleanupService = createMemoryCleanupService({
    rootDirectory,
    getMemoryCatalog: () => memoryStateManager.getMemoryCatalog(),
    applyMemoryUpdates: (payload) => memoryStateManager.applyMemoryUpdates(payload),
  });

  cleanupService.start();

  return {
    id: 'Memory',
    ipcHandlers: [
      {
        channel: 'memory:list',
        handler: async () => memoryStateManager.listMemories(),
      },
      {
        channel: 'memory:read',
        handler: async (_event, filename) => memoryStateManager.readMemoryFile(filename),
      },
      {
        channel: 'memory:save',
        handler: async (_event, filename, content) =>
          memoryStateManager.saveMemory(filename, content),
      },
      {
        channel: 'memory:search',
        handler: async (_event, query, limit) => memoryStateManager.searchMemories(query, limit),
      },
      {
        channel: 'memory:get-context',
        handler: async (_event, maxChars) => memoryStateManager.getMemoryContext(maxChars),
      },
      {
        channel: 'memory:get-catalog',
        handler: async () => memoryStateManager.getMemoryCatalog(),
      },
      {
        channel: 'memory:get-export-prompt',
        handler: async () => memoryStateManager.getExportPrompt(),
      },
      {
        channel: 'memory:get-triage-prompt',
        handler: async () => memoryStateManager.getTriagePrompt(),
      },
      {
        channel: 'memory:get-import-prompt',
        handler: async () => memoryStateManager.getImportPrompt(),
      },
      {
        channel: 'memory:apply-updates',
        handler: async (_event, payload) => memoryStateManager.applyMemoryUpdates(payload),
      },
      {
        channel: 'memory:delete',
        handler: async (_event, filename) => memoryStateManager.deleteMemory(filename),
      },
      {
        channel: 'memory:cleanup-ai-reply',
        handler: async (_event, id, result) => cleanupService.handleAIResponse(id, result),
      },
      {
        channel: 'memory:cleanup-renderer-ready',
        handler: async () => cleanupService.handleRendererReady(),
      },
      {
        channel: 'memory:run-cleanup',
        handler: async () => cleanupService.runCleanup({ force: true }),
      },
      {
        channel: 'memory:list-dreams',
        handler: async () => cleanupService.listDreams(),
      },
      {
        channel: 'memory:read-dream',
        handler: async (_event, dateStr) => cleanupService.readDream(dateStr),
      },
    ],
    dispose: () => {
      cleanupService.stop();
    },
  };
}
