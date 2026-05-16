import strings from './I18n/en.js';
import { createSupabaseToolHandlers } from './Core/SupabaseTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createSupabaseConnectorToolHandlers } from './Executors.js';
import { buildSupabasePromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'supabase',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createSupabaseToolHandlers({ rootDirectory }),
      ...createSupabaseConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildSupabasePromptSection()],
  };
}

export default createToolPackage;
