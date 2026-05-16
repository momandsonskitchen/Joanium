import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../../Core/ConnectorToolAdapter.js';
import { executeLinearChatTool } from './Core/Chat/ChatExecutor.js';

export { executeLinearChatTool };

export function createLinearConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeLinearChatTool,
  });
}
