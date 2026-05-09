import strings from './I18n/en.js';
import { createJiraToolHandlers } from './Core/JiraTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'jira',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createJiraToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
