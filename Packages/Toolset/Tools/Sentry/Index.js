import strings from './I18n/en.js';
import { createSentryToolHandlers } from './Core/SentryTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createSentryLegacyToolHandlers } from './Executors.js';
import { buildSentryPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/LegacyToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'sentry',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createSentryLegacyToolHandlers({ rootDirectory }),
      ...createSentryToolHandlers({ rootDirectory })
    },
    promptSections: [buildSentryPromptSection()]
  };
}

export default createToolPackage;