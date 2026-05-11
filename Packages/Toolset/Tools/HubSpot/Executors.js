import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeHubSpotChatTool } from './Core/Chat/ChatExecutor.js';

export { executeHubSpotChatTool };

export function createHubSpotLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeHubSpotChatTool
  });
}