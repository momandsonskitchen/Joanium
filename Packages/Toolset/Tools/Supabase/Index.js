import strings from './I18n/en.js';
import { createSupabaseToolHandlers } from './Core/SupabaseTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'supabase',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createSupabaseToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
