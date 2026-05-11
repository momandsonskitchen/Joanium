import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeSupabaseChatTool } from './Core/Chat/ChatExecutor.js';

export { executeSupabaseChatTool };

export function createSupabaseLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeSupabaseChatTool
  });
}