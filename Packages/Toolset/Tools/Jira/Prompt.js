import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildJiraPromptSection() {
  return buildConnectorPromptSection('Jira', TOOL_DEFINITIONS);
}