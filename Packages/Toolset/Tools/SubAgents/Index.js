import { SUB_AGENT_TOOLS } from './Tools.js';
import { createSubAgentToolHandlers } from './Executors.js';
import { buildSubAgentPromptSection } from './Prompt.js';
import { readBundledPromptFile } from '../../../Shared/Utils/PromptUtils.js';

export async function createToolPackage({ rootDirectory } = {}) {
  const subAgentPrompt = await readBundledPromptFile(rootDirectory, 'SubAgentTool.md');

  return {
    id: 'sub-agents',
    toolDefinitions: SUB_AGENT_TOOLS,
    toolHandlers: createSubAgentToolHandlers(),
    promptSections: [buildSubAgentPromptSection(subAgentPrompt)],
  };
}

export default createToolPackage;
