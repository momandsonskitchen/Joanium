import strings from './I18n/en.js';
import { createHubSpotToolHandlers } from './Core/HubSpotTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createHubSpotLegacyToolHandlers } from './Executors.js';
import { buildHubSpotPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/LegacyToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'hubspot',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createHubSpotLegacyToolHandlers({ rootDirectory }),
      ...createHubSpotToolHandlers({ rootDirectory })
    },
    promptSections: [buildHubSpotPromptSection()]
  };
}

export default createToolPackage;