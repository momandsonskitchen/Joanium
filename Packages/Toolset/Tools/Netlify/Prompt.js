import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildNetlifyPromptSection() {
  return buildConnectorPromptSection('Netlify', TOOL_DEFINITIONS);
}