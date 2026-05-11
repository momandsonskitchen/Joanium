import strings from './I18n/en.js';
import { createGoogleToolHandlers } from './Core/GoogleTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createGoogleConnectorToolHandlers } from './Executors.js';
import { buildGooglePromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'google',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createGoogleToolHandlers({ rootDirectory }),
      ...createGoogleConnectorToolHandlers({ rootDirectory })
    },
    promptSections: [buildGooglePromptSection()]
  };
}

export default createToolPackage;