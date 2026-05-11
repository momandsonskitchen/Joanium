import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildSentryPromptSection() {
  return buildConnectorPromptSection('Sentry', TOOL_DEFINITIONS);
}