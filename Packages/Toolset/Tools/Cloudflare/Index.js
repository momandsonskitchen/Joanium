import strings from './I18n/en.js';
import { createCloudflareToolHandlers } from './Core/CloudflareTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createCloudflareConnectorToolHandlers } from './Executors.js';
import { buildCloudflarePromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'cloudflare',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createCloudflareToolHandlers({ rootDirectory }),
      ...createCloudflareConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildCloudflarePromptSection()],
  };
}

export default createToolPackage;
