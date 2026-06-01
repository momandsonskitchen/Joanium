import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';

function createConnectorEngine(rootDirectory, state) {
  return {
    getCredentials(connectorId) {
      return state.connectors?.details?.[connectorId] ?? null;
    },

    async updateCredentials(connectorId, updates = {}) {
      const nextUpdates = Object.fromEntries(
        Object.entries(updates)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
      );

      if (Object.keys(nextUpdates).length === 0) {
        return this.getCredentials(connectorId);
      }

      await writeUserState(rootDirectory, {
        ...state,
        connectors: {
          ...(state.connectors ?? {}),
          details: {
            ...(state.connectors?.details ?? {}),
            [connectorId]: {
              ...(state.connectors?.details?.[connectorId] ?? {}),
              ...nextUpdates,
            },
          },
        },
      });

      state.connectors.details[connectorId] ??= {};
      Object.assign(state.connectors.details[connectorId], nextUpdates);
      return this.getCredentials(connectorId);
    },
  };
}

export function mergeToolDefinitions(...toolGroups) {
  const byName = new Map();
  for (const tool of toolGroups.flat()) {
    if (tool?.name) byName.set(tool.name, tool);
  }
  return [...byName.values()];
}

export async function createConnectorToolContext(rootDirectory) {
  const state = await readUserState(rootDirectory);
  state.connectors ??= {};
  state.connectors.details ??= {};
  return {
    connectorEngine: createConnectorEngine(rootDirectory, state),
  };
}

export function createConnectorToolHandlers({ rootDirectory, toolDefinitions = [], executeTool }) {
  if (typeof executeTool !== 'function') return {};

  return Object.fromEntries(
    toolDefinitions
      .filter((tool) => tool?.name)
      .map((tool) => [
        tool.name,
        async (params = {}) => {
          const result = await executeTool(
            await createConnectorToolContext(rootDirectory),
            tool.name,
            params,
          );
          if (result && typeof result === 'object' && result.ok === false) {
            throw new Error(result.error ?? 'Tool failed.');
          }
          return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        },
      ]),
  );
}

export function buildConnectorPromptSection(connectorName, toolDefinitions) {
  const name = String(connectorName ?? '').trim();
  const tools = Array.isArray(toolDefinitions) ? toolDefinitions : [];

  if (!name || tools.length === 0) {
    return '';
  }

  const toolLines = tools
    .filter((tool) => tool?.name)
    .map((tool) => {
      const params = Object.entries(tool.parameters ?? {})
        .map(([key, value]) => `${key}${value.required ? '' : '?'}:${value.type}`)
        .join(', ');
      return `- ${tool.name}: ${tool.description ?? ''}${params ? ` Parameters: ${params}.` : ''}`;
    })
    .join('\n');

  if (!toolLines) {
    return '';
  }

  return `## ${name} Tools\n${toolLines}`;
}
