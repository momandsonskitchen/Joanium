import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../../Core/ConnectorToolAdapter.js';

export function buildCloudflarePromptSection() {
  return buildConnectorPromptSection('Cloudflare', TOOL_DEFINITIONS);
}
