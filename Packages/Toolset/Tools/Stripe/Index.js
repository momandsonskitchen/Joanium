import strings from './I18n/en.js';
import { createStripeToolHandlers } from './Core/StripeTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createStripeLegacyToolHandlers } from './Executors.js';
import { buildStripePromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/LegacyToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'stripe',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createStripeLegacyToolHandlers({ rootDirectory }),
      ...createStripeToolHandlers({ rootDirectory })
    },
    promptSections: [buildStripePromptSection()]
  };
}

export default createToolPackage;