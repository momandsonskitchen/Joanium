import strings from './I18n/en.js';
import { createSentryToolHandlers } from './Core/SentryTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'sentry',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createSentryToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
