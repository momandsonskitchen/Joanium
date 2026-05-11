import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
import { executeSpotifyChatTool } from './Core/Chat/ChatExecutor.js';

export { executeSpotifyChatTool };

export function createSpotifyConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeSpotifyChatTool
  });
}