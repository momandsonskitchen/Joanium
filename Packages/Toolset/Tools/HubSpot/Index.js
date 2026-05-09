import strings from './I18n/en.js';
import { createHubSpotToolHandlers } from './Core/HubSpotTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'hubspot',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createHubSpotToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
