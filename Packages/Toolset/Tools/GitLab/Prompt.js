import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildGitLabPromptSection() {
  return buildConnectorPromptSection('GitLab', TOOL_DEFINITIONS);
}