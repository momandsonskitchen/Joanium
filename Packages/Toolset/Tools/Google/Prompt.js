import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildGooglePromptSection() {
  return buildConnectorPromptSection('Google Workspace', TOOL_DEFINITIONS);
}
