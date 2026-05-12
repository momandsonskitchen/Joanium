import { SUB_AGENT_TOOLS } from './Tools.js';
import { createSubAgentToolHandlers } from './Executors.js';
import { buildSubAgentPromptSection } from './Prompt.js';

export function createToolPackage() {
  return {
    id: 'sub-agents',
    toolDefinitions: SUB_AGENT_TOOLS,
    toolHandlers: createSubAgentToolHandlers(),
    promptSections: [buildSubAgentPromptSection()],
  };
}

export default createToolPackage;
