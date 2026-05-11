import { TOOL_DEFINITIONS } from './Tools.js';
import { createLegacyToolHandlers } from '../Core/LegacyToolAdapter.js';
import { executeFigmaChatTool } from './Core/Chat/ChatExecutor.js';

export { executeFigmaChatTool };

export function createFigmaLegacyToolHandlers({ rootDirectory }) {
  return createLegacyToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeFigmaChatTool
  });
}