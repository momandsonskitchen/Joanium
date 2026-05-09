import strings from './I18n/en.js';
import { createStripeToolHandlers } from './Core/StripeTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'stripe',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createStripeToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
