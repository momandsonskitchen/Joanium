import strings from './I18n/en.js';
import { createGitHubToolHandlers } from './Core/GitHubTools.js';
import { TOOL_DEFINITIONS } from './Tools.js';
import { createGitHubLegacyToolHandlers } from './Executors.js';
import { buildGitHubPromptSection } from './Prompt.js';
import { mergeToolDefinitions } from '../Core/LegacyToolAdapter.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'github',
    connectors: [strings.connector],
    toolDefinitions: mergeToolDefinitions(TOOL_DEFINITIONS, strings.tools ?? []),
    toolHandlers: {
      ...createGitHubLegacyToolHandlers({ rootDirectory }),
      ...createGitHubToolHandlers({ rootDirectory })
    },
    promptSections: [buildGitHubPromptSection()]
  };
}

export default createToolPackage;