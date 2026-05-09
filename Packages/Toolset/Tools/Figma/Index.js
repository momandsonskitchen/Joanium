import strings from './I18n/en.js';
import { createFigmaToolHandlers } from './Core/FigmaTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'figma',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createFigmaToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
