import { createToolsetService } from './Core/ToolsetService.js';
import { createConnectorStateManager } from './Core/ConnectorState.js';
import { startGoogleOAuthFlow } from './Core/GoogleOAuth.js';
import { discoverToolPackages } from './Core/ToolDiscovery.js';

function ownerWindow(event) {
  return event?.sender?.getOwnerBrowserWindow?.() ?? null;
}

export async function createPackage({ rootDirectory, registry }) {
  const toolPackages = await discoverToolPackages({
    rootDirectory,
    registry,
    externalPackageIds: ['LiveBrowser'],
  });
  const connectorStateManager = createConnectorStateManager({
    rootDirectory,
    connectorCatalog: toolPackages.connectors,
  });
  const toolsetService = createToolsetService({
    toolHandlers: toolPackages.toolHandlers,
    toolDefinitions: toolPackages.toolDefinitions,
    promptSections: toolPackages.promptSections,
  });

  return {
    id: 'Toolset',
    ipcCompanions: ['LiveBrowser'],
    ipcHandlers: [
      {
        channel: 'toolset:list-tools',
        handler: async () => toolsetService.listTools(),
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
