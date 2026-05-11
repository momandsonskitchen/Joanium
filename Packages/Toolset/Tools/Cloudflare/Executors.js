import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeCloudflareChatTool } from './Core/Chat/ChatExecutor.js';

export { executeCloudflareChatTool };

export function createCloudflareLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeCloudflareChatTool
  });
}