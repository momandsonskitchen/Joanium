import { TOOL_DEFINITIONS } from './Tools.js';
import { createConnectorToolHandlers } from '../Core/ConnectorToolAdapter.js';
import { executeSupabaseChatTool } from './Core/Chat/ChatExecutor.js';

export { executeSupabaseChatTool };

export function createSupabaseConnectorToolHandlers({ rootDirectory }) {
  return createConnectorToolHandlers({
    rootDirectory,
    toolDefinitions: TOOL_DEFINITIONS,
    executeTool: executeSupabaseChatTool,
  });
}
