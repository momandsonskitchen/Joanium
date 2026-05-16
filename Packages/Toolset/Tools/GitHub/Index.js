import strings from './I18n/en.js';
import { createGitHubToolHandlers } from './Core/GitHubTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createGitHubConnectorToolHandlers } from './Executors.js';
import { buildGitHubPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'github',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createGitHubToolHandlers({ rootDirectory }),
      ...createGitHubConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildGitHubPromptSection()],
  };
}

export default createToolPackage;
