import electron from 'electron';
import os from 'node:os';
import { createToolsetService } from './Core/ToolsetService.js';
import { createTerminalService } from './Terminal/TerminalService.js';
import {
  createBrowserPreviewService,
  LIVE_BROWSER_TOOL_NAMES
} from './LiveBrowser/BrowserPreviewService.js';
import { createConnectorStateManager } from './Connectors/Core/ConnectorState.js';
import { startGoogleOAuthFlow } from './Connectors/Core/GoogleOAuth.js';
import { discoverToolPackages } from './Tools/Index.js';

const { dialog } = electron;

function ownerWindow(event) {
  return event?.sender?.getOwnerBrowserWindow?.() ?? null;
}

export async function createPackage({ rootDirectory }) {
  const terminalService = createTerminalService({ rootDirectory });
  const browserPreviewService = createBrowserPreviewService({ rootDirectory });
  const toolPackages = await discoverToolPackages({ rootDirectory });
  const connectorStateManager = createConnectorStateManager({
    rootDirectory,
    connectorCatalog: toolPackages.connectors
  });
  const browserToolHandlers = Object.fromEntries(
    LIVE_BROWSER_TOOL_NAMES.map((toolName) => [
      toolName,
      (parameters, context) => browserPreviewService.executeTool(toolName, parameters, context)
    ])
  );
  const toolsetService = createToolsetService({
    toolHandlers: {
      ...browserToolHandlers,
      ...toolPackages.toolHandlers
    },
    toolDefinitions: toolPackages.toolDefinitions,
    promptSections: toolPackages.promptSections
  });

  return {
    id: 'Toolset',
    ipcHandlers: [
      {
        channel: 'toolset:list-tools',
        handler: async () => toolsetService.listTools()
      },
      {
        channel: 'toolset:execute-tool',
        handler: async (event, payload) => toolsetService.executeTool(payload, {
          ownerWindow: ownerWindow(event),
          sender: event.sender
        })
      },
      {
        channel: 'connectors:list',
        handler: async () => connectorStateManager.listConnectors()
      },
      {
        channel: 'connectors:save',
        handler: async (_event, connectorId, incoming) => connectorStateManager.saveConnector(connectorId, incoming)
      },
      {
        channel: 'connectors:remove',
        handler: async (_event, connectorId) => connectorStateManager.removeConnector(connectorId)
      },
      {
        channel: 'connectors:google-oauth',
        handler: async (_event, { clientId, clientSecret } = {}) => {
          if (!clientId?.trim() || !clientSecret?.trim()) {
            throw new Error('Client ID and Client Secret are required before connecting.');
          }
          const tokens = await startGoogleOAuthFlow({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
          return connectorStateManager.saveConnectorDetails('google', {
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            refreshToken: tokens.refreshToken
          });
        }
      },
      {
        channel: 'terminal:get-default-cwd',
        handler: async () => ({ ok: true, cwd: os.homedir() })
      },
      {
        channel: 'terminal:resolve-directory',
        handler: async (_event, payload) => terminalService.resolveDirectoryChange(payload)
      },
      {
        channel: 'terminal:select-directory',
        handler: async (event, options = {}) => {
          const window = ownerWindow(event);
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
        channel: 'terminal:git-branches',
        handler: async (_event, payload) => terminalService.gitBranches(payload)
      },
      {
        channel: 'terminal:git-create-branch',
        handler: async (_event, payload) => terminalService.gitCreateBranch(payload)
      },
      {
        channel: 'terminal:git-checkout-branch',
        handler: async (_event, payload) => terminalService.gitCheckoutBranch(payload)
      },
      {
        channel: 'terminal:git-delete-branch',
        handler: async (_event, payload) => terminalService.gitDeleteBranch(payload)
      },
      {
        channel: 'terminal:git-pull',
        handler: async (_event, payload) => terminalService.gitPull(payload)
      },
      {
        channel: 'terminal:git-commit',
        handler: async (_event, payload) => terminalService.gitCommit(payload)
      },
      {
        channel: 'terminal:git-push',
        handler: async (_event, payload) => terminalService.gitPush(payload)
      },
      {
        channel: 'terminal:git-push-sync',
        handler: async (_event, payload) => terminalService.gitPushSync(payload)
      },
      {
        channel: 'terminal:run-project-checks',
        handler: async (_event, payload) => terminalService.runProjectChecks(payload)
      },
      {
        channel: 'browser-preview:get-state',
        handler: async (event) => {
          browserPreviewService.attachToWindow(ownerWindow(event));
          return browserPreviewService.getState();
        }
      },
      {
        channel: 'browser-preview:load-url',
        handler: async (event, url) => browserPreviewService.loadUrl(url, ownerWindow(event))
      },
      {
        channel: 'browser-preview:set-visible',
        handler: async (event, visible) => browserPreviewService.setVisible(visible, ownerWindow(event))
      },
      {
        channel: 'browser-preview:set-bounds',
        handler: async (event, bounds) => browserPreviewService.setHostBounds(bounds, ownerWindow(event))
      },
      {
        channel: 'browser-preview:hide',
        handler: async () => browserPreviewService.hide()
      },
      {
        channel: 'browser-preview:go-back',
        handler: async () => browserPreviewService.goBack()
      },
      {
        channel: 'browser-preview:go-forward',
        handler: async () => browserPreviewService.goForward()
      },
      {
        channel: 'browser-preview:reload',
        handler: async () => browserPreviewService.reload()
      },
      {
        channel: 'browser-preview:pause',
        handler: async () => browserPreviewService.pauseView()
      },
      {
        channel: 'browser-preview:resume',
        handler: async (event) => {
          browserPreviewService.attachToWindow(ownerWindow(event));
          browserPreviewService.resumeView();
        }
      },
      {
        channel: 'browser-preview:close',
        handler: async () => browserPreviewService.close()
      }
    ]
  };
}
