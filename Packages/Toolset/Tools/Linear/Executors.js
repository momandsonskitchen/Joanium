import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeLinearChatTool } from './Core/Chat/ChatExecutor.js';

export { executeLinearChatTool };

export function createLinearLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeLinearChatTool
  });
}