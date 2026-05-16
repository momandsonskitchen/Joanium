import strings from './I18n/en.js';
import { createLinearToolHandlers } from './Core/LinearTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createLinearConnectorToolHandlers } from './Executors.js';
import { buildLinearPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'linear',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createLinearToolHandlers({ rootDirectory }),
      ...createLinearConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildLinearPromptSection()],
  };
}

export default createToolPackage;
