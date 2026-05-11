import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeGitlabChatTool } from './Core/Chat/ChatExecutor.js';

export { executeGitlabChatTool };

export function createGitLabLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeGitlabChatTool
  });
}