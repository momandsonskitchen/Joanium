import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeNetlifyChatTool } from './Core/Chat/ChatExecutor.js';

export { executeNetlifyChatTool };

export function createNetlifyLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeNetlifyChatTool
  });
}