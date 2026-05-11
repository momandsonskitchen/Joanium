import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildLinearPromptSection() {
  return buildConnectorPromptSection('Linear', TOOL_DEFINITIONS);
}