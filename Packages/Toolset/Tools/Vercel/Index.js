import strings from './I18n/en.js';
import { createVercelToolHandlers } from './Core/VercelTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createVercelConnectorToolHandlers } from './Executors.js';
import { buildVercelPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'vercel',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createVercelToolHandlers({ rootDirectory }),
      ...createVercelConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildVercelPromptSection()],
  };
}

export default createToolPackage;
