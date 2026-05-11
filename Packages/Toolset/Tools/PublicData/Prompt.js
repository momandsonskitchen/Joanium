import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildPublicDataPromptSection() {
  return buildConnectorPromptSection('Public data', TOOL_DEFINITIONS);
}
