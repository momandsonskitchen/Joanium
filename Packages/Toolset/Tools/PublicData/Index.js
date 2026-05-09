import {
  createPublicDataToolHandlers,
  PUBLIC_DATA_TOOL_DEFINITIONS
} from './Core/PublicDataTools.js';

export function createToolPackage({ rootDirectory }) {
  return {
    id: 'public-data',
    toolDefinitions: PUBLIC_DATA_TOOL_DEFINITIONS,
    toolHandlers: createPublicDataToolHandlers({ rootDirectory })
  };
}

export default createToolPackage;
