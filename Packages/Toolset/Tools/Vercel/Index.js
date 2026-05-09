import strings from './I18n/en.js';
import { createVercelToolHandlers } from './Core/VercelTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'vercel',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createVercelToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
