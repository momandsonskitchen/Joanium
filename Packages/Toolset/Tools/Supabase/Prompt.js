import { TOOL_DEFINITIONS } from './Tools.js';
import { buildConnectorPromptSection } from '../../Core/ConnectorToolAdapter.js';

export function buildSupabasePromptSection() {
  return buildConnectorPromptSection('Supabase', TOOL_DEFINITIONS);
}
