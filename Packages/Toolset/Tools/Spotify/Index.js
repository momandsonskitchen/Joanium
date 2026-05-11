import strings from './I18n/en.js';
import { createSpotifyToolHandlers } from './Core/SpotifyTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createSpotifyLegacyToolHandlers } from './Executors.js';
import { buildSpotifyPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/LegacyToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'spotify',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createSpotifyLegacyToolHandlers({ rootDirectory }),
      ...createSpotifyToolHandlers({ rootDirectory })
    },
    promptSections: [buildSpotifyPromptSection()]
  };
}

export default createToolPackage;