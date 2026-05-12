import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
import { executeGithubChatTool } from './Core/Chat/ChatExecutor.js';

export { executeGithubChatTool };

export function createGitHubConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeGithubChatTool,
  });
}
