import strings from './I18n/en.js';
import { createHubSpotToolHandlers } from './Core/HubSpotTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createHubSpotConnectorToolHandlers } from './Executors.js';
import { buildHubSpotPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'hubspot',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createHubSpotToolHandlers({ rootDirectory }),
      ...createHubSpotConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildHubSpotPromptSection()],
  };
}

export default createToolPackage;
