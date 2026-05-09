import strings from './I18n/en.js';
import { createCloudflareToolHandlers } from './Core/CloudflareTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'cloudflare',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createCloudflareToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
