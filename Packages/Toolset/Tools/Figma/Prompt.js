import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildFigmaPromptSection() {
  return buildConnectorPromptSection('Figma', TOOL_DEFINITIONS);
}
