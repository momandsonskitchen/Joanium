import strings from './I18n/en.js';
import { createNotionToolHandlers } from './Core/NotionTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'notion',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createNotionToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
