import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeJiraChatTool } from './Core/Chat/ChatExecutor.js';

export { executeJiraChatTool };

export function createJiraLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeJiraChatTool
  });
}