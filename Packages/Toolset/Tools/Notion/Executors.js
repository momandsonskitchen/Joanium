import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../../Core/ConnectorToolAdapter.js';
import { executeNotionChatTool } from './Core/Chat/ChatExecutor.js';

export { executeNotionChatTool };

export function createNotionConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeNotionChatTool,
  });
}
