import strings from './I18n/en.js';
import { createGoogleToolHandlers } from './Core/GoogleTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'google',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createGoogleToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
