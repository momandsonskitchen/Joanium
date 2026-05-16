import strings from './I18n/en.js';
import { createSpotifyToolHandlers } from './Core/SpotifyTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createSpotifyConnectorToolHandlers } from './Executors.js';
import { buildSpotifyPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'spotify',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createSpotifyToolHandlers({ rootDirectory }),
      ...createSpotifyConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildSpotifyPromptSection()],
  };
}

export default createToolPackage;
