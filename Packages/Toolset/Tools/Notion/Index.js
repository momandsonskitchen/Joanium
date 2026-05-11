import strings from './I18n/en.js';
import { createNotionToolHandlers } from './Core/NotionTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createNotionConnectorToolHandlers } from './Executors.js';
import { buildNotionPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'notion',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createNotionToolHandlers({ rootDirectory }),
      ...createNotionConnectorToolHandlers({ rootDirectory })
    },
    promptSections: [buildNotionPromptSection()]
  };
}

export default createToolPackage;