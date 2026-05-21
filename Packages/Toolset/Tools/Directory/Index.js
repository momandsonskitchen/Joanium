import { createDirectoryService } from './Core/DirectoryService.js';

export function createToolPackage({ rootDirectory } = {}) {
  const directoryService = createDirectoryService({ rootDirectory });

  return {
    id: 'directory',
    ipcHandlers: [
      {
        channel: 'terminal:read-file',
        handler: async (_event, payload) => directoryService.readTextFile(payload),
      },
      {
        channel: 'terminal:write-file',
        handler: async (_event, payload) => directoryService.writeFile(payload),
      },
      {
        channel: 'terminal:apply-file-patch',
        handler: async (_event, payload) => directoryService.applyFilePatch(payload),
      },
      {
        channel: 'terminal:delete-item',
        handler: async (_event, payload) => directoryService.deleteItem(payload),
      },
      {
        channel: 'terminal:list-directory',
        handler: async (_event, payload) => directoryService.listDirectory(payload),
      },
      {
        channel: 'terminal:search-workspace',
        handler: async (_event, payload) => directoryService.searchWorkspace(payload),
      },
      {
        channel: 'terminal:inspect-workspace',
        handler: async (_event, payload) => directoryService.inspectWorkspace(payload),
      },
      {
        channel: 'terminal:create-directory',
        handler: async (_event, payload) => directoryService.createDirectory(payload),
      },
      {
        channel: 'terminal:move-file',
        handler: async (_event, payload) => directoryService.moveLocalFile(payload),
      },
      {
        channel: 'terminal:copy-file',
        handler: async (_event, payload) => directoryService.copyLocalFile(payload),
      },
    ],
  };
}

export default createToolPackage;
