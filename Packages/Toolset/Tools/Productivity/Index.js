import strings from './I18n/en.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createProductivityToolHandlers } from './Executors.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'productivity',
    connectors: strings.connectors,
    toolDefinitions: TOOL_DEFINITIONS,
    toolHandlers: createProductivityToolHandlers({ rootDirectory }),
  };
}

export default createToolPackage;
