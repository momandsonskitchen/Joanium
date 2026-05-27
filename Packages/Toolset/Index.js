import { createToolsetService } from './Core/ToolsetService.js';
import { createConnectorStateManager } from './Core/ConnectorState.js';
import { startGoogleOAuthFlow } from './Core/GoogleOAuth.js';
import { discoverToolPackages } from './Core/ToolDiscovery.js';
import { debugLog } from '../Shared/Debug/DebugLogger.js';
import { summarizeToolDefinitions } from './Core/Utils.js';
import { readBundledPromptFile } from '../Shared/Utils/PromptUtils.js';

function ownerWindow(event) {
  return event?.sender?.getOwnerBrowserWindow?.() ?? null;
}

export async function createPackage({ rootDirectory, registry }) {
  const toolPackages = await discoverToolPackages({
    rootDirectory,
    registry,
    externalPackageIds: ['LiveBrowser'],
  });
  debugLog('Toolset', 'Discovered tool packages', {
    packageCount: toolPackages.packages.length,
    toolCount: toolPackages.toolDefinitions.length,
    promptSectionCount: toolPackages.promptSections.length,
    packages: toolPackages.packages.map((toolPackage) => ({
      id: toolPackage.id,
      toolCount: toolPackage.toolDefinitions.length,
      connectorIds: toolPackage.connectors.map((connector) => connector.id),
    })),
    tools: summarizeToolDefinitions(toolPackages.toolDefinitions),
  });
  const connectorStateManager = createConnectorStateManager({
    rootDirectory,
    connectorCatalog: toolPackages.connectors,
  });
  const toolsetPrompt = await readBundledPromptFile(rootDirectory, 'Toolset.md');
  const toolsetService = createToolsetService({
    toolHandlers: toolPackages.toolHandlers,
    toolDefinitions: toolPackages.toolDefinitions,
    promptSections: toolPackages.promptSections,
    packages: toolPackages.packages,
    promptTemplate: toolsetPrompt,
  });

  return {
    id: 'Toolset',
    ipcCompanions: ['LiveBrowser'],
    ipcHandlers: [
      {
        channel: 'toolset:list-tools',
        handler: async () => {
          const connectors = await connectorStateManager.listConnectors();
          const result = toolsetService.listTools({ connectors });
          debugLog('Toolset', 'Listed active tools', {
            connectorCount: connectors.length,
            activeToolCount: result.tools.length,
            tools: summarizeToolDefinitions(result.tools),
            promptLength: result.systemPrompt.length,
          });
          return result;
        },
      },
      {
        channel: 'toolset:execute-tool',
        handler: async (event, payload) =>
          toolsetService.executeTool(payload, {
            ownerWindow: ownerWindow(event),
            sender: event.sender,
          }),
      },
      {
        channel: 'connectors:list',
        handler: async () => connectorStateManager.listConnectors(),
      },
      {
        channel: 'connectors:save',
        handler: async (_event, connectorId, incoming) =>
          connectorStateManager.saveConnector(connectorId, incoming),
      },
      {
        channel: 'connectors:remove',
        handler: async (_event, connectorId) => connectorStateManager.removeConnector(connectorId),
      },
      {
        channel: 'connectors:google-oauth',
        handler: async (_event, { clientId, clientSecret } = {}) => {
          if (!clientId?.trim() || !clientSecret?.trim()) {
            throw new Error('Client ID and Client Secret are required before connecting.');
          }

          const tokens = await startGoogleOAuthFlow({
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
          });

          return connectorStateManager.saveConnectorDetails('google', {
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            refreshToken: tokens.refreshToken,
          });
        },
      },
      ...toolPackages.ipcHandlers,
    ],
  };
}
