import strings from './I18n/en.js';
import { createFigmaToolHandlers } from './Core/FigmaTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createFigmaLegacyToolHandlers } from './Executors.js';
import { buildFigmaPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/LegacyToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'figma',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createFigmaLegacyToolHandlers({ rootDirectory }),
      ...createFigmaToolHandlers({ rootDirectory })
    },
    promptSections: [buildFigmaPromptSection()]
  };
}

export default createToolPackage;