import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../../Core/ConnectorToolAdapter.js';
import { executeFigmaChatTool } from './Core/Chat/ChatExecutor.js';

export { executeFigmaChatTool };

export function createFigmaConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeFigmaChatTool,
  });
}
