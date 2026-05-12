import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
import { executeGitlabChatTool } from './Core/Chat/ChatExecutor.js';

export { executeGitlabChatTool };

export function createGitLabConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeGitlabChatTool,
  });
}
