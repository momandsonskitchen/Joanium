import strings from './I18n/en.js';
import { createSpotifyToolHandlers } from './Core/SpotifyTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'spotify',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createSpotifyToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
