import strings from './I18n/en.js';
import { createOpenWeatherToolHandlers } from './Core/OpenWeatherTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'openweather',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createOpenWeatherToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
