import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeSpotifyChatTool } from './Core/Chat/ChatExecutor.js';

export { executeSpotifyChatTool };

export function createSpotifyLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeSpotifyChatTool
  });
}