import strings from './I18n/en.js';
import { createJiraToolHandlers } from './Core/JiraTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createJiraConnectorToolHandlers } from './Executors.js';
import { buildJiraPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'jira',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createJiraToolHandlers({ rootDirectory }),
      ...createJiraConnectorToolHandlers({ rootDirectory })
    },
    promptSections: [buildJiraPromptSection()]
  };
}

export default createToolPackage;