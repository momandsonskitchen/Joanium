import strings from './I18n/en.js';
import { createNetlifyToolHandlers } from './Core/NetlifyTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'netlify',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createNetlifyToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
