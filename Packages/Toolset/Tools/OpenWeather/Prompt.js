import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildOpenWeatherPromptSection() {
  return buildConnectorPromptSection('OpenWeather', TOOL_DEFINITIONS);
}
