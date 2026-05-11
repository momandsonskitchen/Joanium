import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/ConnectorToolAdapter.js';

export function buildSpotifyPromptSection() {
  return buildConnectorPromptSection('Spotify', TOOL_DEFINITIONS);
}