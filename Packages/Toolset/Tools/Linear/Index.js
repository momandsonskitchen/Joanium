import strings from './I18n/en.js';
import { createLinearToolHandlers } from './Core/LinearTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'linear',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createLinearToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
