import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../../Core/ConnectorToolAdapter.js';
import { executeNetlifyChatTool } from './Core/Chat/ChatExecutor.js';

export { executeNetlifyChatTool };

export function createNetlifyConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeNetlifyChatTool,
  });
}
