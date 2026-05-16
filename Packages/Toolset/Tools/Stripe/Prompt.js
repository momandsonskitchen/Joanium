import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../../Core/ConnectorToolAdapter.js';

export function buildStripePromptSection() {
  return buildConnectorPromptSection('Stripe', TOOL_DEFINITIONS);
}
