import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildVercelPromptSection() {
  return buildConnectorPromptSection('Vercel', TOOL_DEFINITIONS);
}
