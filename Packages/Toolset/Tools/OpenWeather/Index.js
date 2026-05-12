import strings from './I18n/en.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createOpenWeatherToolHandlers } from './Executors.js';
import { buildOpenWeatherPromptSection } from './Prompt.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'openweather',
    connectors: [strings.connector],
    toolDefinitions: TOOL_DEFINITIONS,
    toolHandlers: createOpenWeatherToolHandlers({ rootDirectory }),
    promptSections: [buildOpenWeatherPromptSection()],
  };
}

export default createToolPackage;
