import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../../Core/ConnectorToolAdapter.js';

export function buildHubSpotPromptSection() {
  return buildConnectorPromptSection('HubSpot', TOOL_DEFINITIONS);
}
