import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../../Core/ConnectorToolAdapter.js';

export function buildUnsplashPromptSection() {
  return buildConnectorPromptSection('Unsplash', TOOL_DEFINITIONS);
}
