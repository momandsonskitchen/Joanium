import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildNotionPromptSection() {
  return buildConnectorPromptSection('Notion', TOOL_DEFINITIONS);
}