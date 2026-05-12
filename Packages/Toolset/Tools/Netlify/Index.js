import strings from './I18n/en.js';
import { createNetlifyToolHandlers } from './Core/NetlifyTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createNetlifyConnectorToolHandlers } from './Executors.js';
import { buildNetlifyPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'netlify',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createNetlifyToolHandlers({ rootDirectory }),
      ...createNetlifyConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildNetlifyPromptSection()],
  };
}

export default createToolPackage;
