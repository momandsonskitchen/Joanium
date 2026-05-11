import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildJiraPromptSection() {
  return buildConnectorPromptSection('Jira', TOOL_DEFINITIONS);
}