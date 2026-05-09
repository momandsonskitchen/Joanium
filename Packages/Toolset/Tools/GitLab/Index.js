import strings from './I18n/en.js';
import { createGitLabToolHandlers } from './Core/GitLabTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'gitlab',
    connectors: [strings.connector],
    toolDefinitions: strings.tools,
    toolHandlers: createGitLabToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
