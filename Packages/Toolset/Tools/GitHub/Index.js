import strings from './I18n/en.js';
import { createGitHubToolHandlers } from './Core/GitHubTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'github',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createGitHubToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
