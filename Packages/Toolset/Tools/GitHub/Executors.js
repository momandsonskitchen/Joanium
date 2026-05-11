import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeGithubChatTool } from './Core/Chat/ChatExecutor.js';

export { executeGithubChatTool };

export function createGitHubLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeGithubChatTool
  });
}