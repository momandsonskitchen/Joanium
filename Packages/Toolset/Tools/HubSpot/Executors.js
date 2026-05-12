import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
import { executeHubSpotChatTool } from './Core/Chat/ChatExecutor.js';

export { executeHubSpotChatTool };

export function createHubSpotConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeHubSpotChatTool,
  });
}
