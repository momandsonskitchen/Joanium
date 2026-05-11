import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildFigmaPromptSection() {
  return buildConnectorPromptSection('Figma', TOOL_DEFINITIONS);
}