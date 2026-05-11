import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildPublicDataPromptSection() {
  return buildConnectorPromptSection('Public data', TOOL_DEFINITIONS);
}
