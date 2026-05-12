import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
import { executeJiraChatTool } from './Core/Chat/ChatExecutor.js';

export { executeJiraChatTool };

export function createJiraConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeJiraChatTool,
  });
}
