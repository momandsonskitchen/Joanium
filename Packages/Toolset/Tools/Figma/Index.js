import strings from './I18n/en.js';
import { createFigmaToolHandlers } from './Core/FigmaTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createFigmaConnectorToolHandlers } from './Executors.js';
import { buildFigmaPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'figma',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createFigmaToolHandlers({ rootDirectory }),
      ...createFigmaConnectorToolHandlers({ rootDirectory })
    },
    promptSections: [buildFigmaPromptSection()]
  };
}

export default createToolPackage;