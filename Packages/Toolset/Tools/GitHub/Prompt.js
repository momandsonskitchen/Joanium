import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildGitHubPromptSection() {
  return buildConnectorPromptSection('GitHub', TOOL_DEFINITIONS);
}