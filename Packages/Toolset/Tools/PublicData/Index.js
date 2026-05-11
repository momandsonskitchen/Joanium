import { TOOL_DEFINITIONS } from './Tools.js';
import { createPublicDataToolHandlers } from './Executors.js';
import { buildPublicDataPromptSection } from './Prompt.js';
import strings from './I18n/en.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'public-data',
    toolDefinitions: TOOL_DEFINITIONS,
    toolHandlers: createPublicDataToolHandlers({ rootDirectory }),
    promptSections: [buildPublicDataPromptSection()],
    connectors: strings.connectors
  };
}

export default createToolPackage;
