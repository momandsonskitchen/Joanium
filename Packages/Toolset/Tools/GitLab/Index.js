import strings from './I18n/en.js';
import { createGitLabToolHandlers } from './Core/GitLabTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createGitLabConnectorToolHandlers } from './Executors.js';
import { buildGitLabPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../../Core/ConnectorToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'gitlab',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createGitLabToolHandlers({ rootDirectory }),
      ...createGitLabConnectorToolHandlers({ rootDirectory }),
    },
    promptSections: [buildGitLabPromptSection()],
  };
}

export default createToolPackage;
