import { TOOL_DEFINITIONS } from './Tools.js';
import { createPublicDataToolHandlers } from './Executors.js';
import { buildPublicDataPromptSection } from './Prompt.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'public-data',
    toolDefinitions: TOOL_DEFINITIONS,
    toolHandlers: createPublicDataToolHandlers({ rootDirectory }),
    promptSections: [buildPublicDataPromptSection()]
  };
}

export default createToolPackage;
