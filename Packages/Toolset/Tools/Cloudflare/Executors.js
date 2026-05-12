import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
import { executeCloudflareChatTool } from './Core/Chat/ChatExecutor.js';

export { executeCloudflareChatTool };

export function createCloudflareConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeCloudflareChatTool,
  });
}
