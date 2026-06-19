import { TOOL_DEFINITIONS } from './Tools.js';
import { createComputerUseToolHandlers } from './Core/ComputerUseTools.js';
import { buildComputerUsePromptSection } from './Prompt.js';

export function createToolPackage() {
  return {
    id: 'computer-use',
    toolDefinitions: TOOL_DEFINITIONS,
    toolHandlers: createComputerUseToolHandlers(),
    promptSections: [buildComputerUsePromptSection()],
  };
}

export default createToolPackage;
