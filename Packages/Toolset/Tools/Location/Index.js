import { LOCATION_TOOL_DEFINITIONS, createLocationToolHandlers } from './Core/LocationTools.js';
import { readBundledPromptFile } from '../../../Shared/Utils/PromptUtils.js';

export async function createToolPackage({ rootDirectory } = {}) {
  const locationPrompt = await readBundledPromptFile(rootDirectory, 'Location.md');

  return {
    id: 'location',
    toolDefinitions: LOCATION_TOOL_DEFINITIONS,
    toolHandlers: createLocationToolHandlers(),
    promptSections: [locationPrompt],
  };
}

export default createToolPackage;
