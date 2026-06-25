import electron from 'electron';
import { createCommandService } from './Core/CommandService.js';

const { dialog } = electron;

function ownerWindow(event) {
  return event?.sender?.getOwnerBrowserWindow?.() ?? null;
}

export function createToolPackage() {
  const commandService = createCommandService();

  return {
    id: 'command',
    ipcHandlers: [
      {
        channel: 'terminal:get-default-cwd',
        handler: async () => ({ ok: true, cwd: commandService.getDefaultCwd() }),
      },
      {
        channel: 'terminal:resolve-directory',
        handler: async (_event, payload) => commandService.resolveDirectoryChange(payload),
      },
      {
        channel: 'terminal:select-directory',
        handler: async (event, options = {}) => {
          const result = await dialog.showOpenDialog(ownerWindow(event), {
            properties: ['openDirectory', 'createDirectory'],
            defaultPath: options.defaultPath?.trim() || undefined,
          });

          return result.canceled || result.filePaths.length === 0
            ? { ok: false }
            : { ok: true, path: result.filePaths[0] };
        },
      },
      {
        channel: 'terminal:assess-command-risk',
        handler: async (_event, payload) => ({
          ok: true,
          risk: commandService.assessCommandRisk(payload?.command),
        }),
      },
      {
        channel: 'terminal:run-command',
        handler: async (_event, payload) => commandService.runCommand(payload),
      },
      {
        channel: 'terminal:spawn-command',
        handler: async (event, payload) => commandService.spawnCommand(payload, event.sender),
      },
      {
        channel: 'terminal:write',
        handler: async (_event, processId, data) => commandService.writeProcess(processId, data),
      },
      {
        channel: 'terminal:kill',
        handler: async (_event, processId) => commandService.killProcess(processId),
      },
      {
        channel: 'terminal:read-output',
        handler: async (_event, processId) => commandService.readProcessOutput(processId),
      },
      {
        channel: 'terminal:run-project-checks',
        handler: async (_event, payload) => commandService.runProjectChecks(payload),
      },
    ],
  };
}

export default createToolPackage;
