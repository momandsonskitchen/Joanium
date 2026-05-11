import strings from './I18n/en.js';
import { createStripeToolHandlers } from './Core/StripeTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createStripeConnectorToolHandlers } from './Executors.js';
import { buildStripePromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'stripe',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createStripeToolHandlers({ rootDirectory }),
      ...createStripeConnectorToolHandlers({ rootDirectory })
    },
    promptSections: [buildStripePromptSection()]
  };
}

export default createToolPackage;