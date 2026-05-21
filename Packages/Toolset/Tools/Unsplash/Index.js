import strings from './I18n/en.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createUnsplashToolHandlers } from './Executors.js';
import { buildUnsplashPromptSection } from './Prompt.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'unsplash',
    connectors: [strings.connector],
    toolDefinitions: TOOL_DEFINITIONS,
    toolHandlers: createUnsplashToolHandlers({ rootDirectory }),
    promptSections: [buildUnsplashPromptSection()],
  };
}

export default createToolPackage;
