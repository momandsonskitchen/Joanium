import { dialog } from 'electron';
import { createTerminalService } from './Core/TerminalService.js';

export async function createPackage({ rootDirectory }) {
  const terminalService = createTerminalService({ rootDirectory });

  return {
    id: 'Terminal',
    ipcHandlers: [
      {
        channel: 'terminal:get-default-cwd',
        handler: async () => ({ ok: true, cwd: terminalService.getDefaultCwd() })
      },
      {
        channel: 'terminal:select-directory',
        handler: async (event, options = {}) => {
          const window = event.sender.getOwnerBrowserWindow();
          const result = await dialog.showOpenDialog(window, {
            properties: ['openDirectory', 'createDirectory'],
            defaultPath: options.defaultPath?.trim() || undefined
          });

          return result.canceled || result.filePaths.length === 0
            ? { ok: false }
            : { ok: true, path: result.filePaths[0] };
        }
      },
      {
        channel: 'terminal:assess-command-risk',
        handler: async (_event, payload) => ({ ok: true, risk: terminalService.assessCommandRisk(payload?.command) })
      },
      {
        channel: 'terminal:run-command',
        handler: async (_event, payload) => terminalService.runCommand(payload)
      },
      {
        channel: 'terminal:spawn-command',
        handler: async (event, payload) => terminalService.spawnCommand(payload, event.sender)
      },
      {
        channel: 'terminal:write',
        handler: async (_event, processId, data) => terminalService.writeProcess(processId, data)
      },
      {
        channel: 'terminal:kill',
        handler: async (_event, processId) => terminalService.killProcess(processId)
      },
      {
        channel: 'terminal:read-output',
        handler: async (_event, processId) => terminalService.readProcessOutput(processId)
      },
      {
        channel: 'terminal:read-file',
        handler: async (_event, payload) => terminalService.readTextFile(payload)
      },
      {
        channel: 'terminal:write-file',
        handler: async (_event, payload) => terminalService.writeFile(payload)
      },
      {
        channel: 'terminal:delete-item',
        handler: async (_event, payload) => terminalService.deleteItem(payload)
      },
      {
        channel: 'terminal:list-directory',
        handler: async (_event, payload) => terminalService.listDirectory(payload)
      },
      {
        channel: 'terminal:search-workspace',
        handler: async (_event, payload) => terminalService.searchWorkspace(payload)
      },
      {
        channel: 'terminal:inspect-workspace',
        handler: async (_event, payload) => terminalService.inspectWorkspace(payload)
      },
      {
        channel: 'terminal:git-status',
        handler: async (_event, payload) => terminalService.gitStatus(payload)
      },
      {
        channel: 'terminal:git-diff',
        handler: async (_event, payload) => terminalService.gitDiff(payload)
      },
      {
        channel: 'terminal:run-project-checks',
        handler: async (_event, payload) => terminalService.runProjectChecks(payload)
      }
    ]
  };
}
