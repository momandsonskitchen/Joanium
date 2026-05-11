import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../Core/LegacyToolAdapter.js';

export function buildStripePromptSection() {
  return buildConnectorPromptSection('Stripe', TOOL_DEFINITIONS);
}