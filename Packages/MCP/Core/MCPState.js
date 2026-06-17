import path from 'node:path';
import { sanitizeFileStem } from '../../Shared/Storage/SafePath.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { createSingleFileState } from '../../Shared/Storage/SingleFileState.js';
import { createSlugId, normalizeString } from '../../Shared/Utils/StringUtils.js';

const VALID_TRANSPORTS = new Set(['stdio', 'http']);

function sanitizeArgs(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function sanitizeEnv(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, val]) => [normalizeString(key), normalizeString(val)])
      .filter(([key]) => key),
  );
}

export function sanitizeServerConfig(candidate = {}) {
  const transport = VALID_TRANSPORTS.has(candidate.transport) ? candidate.transport : 'stdio';
  const name = normalizeString(candidate.name) || 'MCP Server';
  const id = sanitizeFileStem(candidate.id) || createSlugId(name, 'mcp-server');

  return {
    id,
    name,
    transport,
    enabled: Boolean(candidate.enabled),
    description: normalizeString(candidate.description),
    command: transport === 'stdio' ? normalizeString(candidate.command) : '',
    args: transport === 'stdio' ? sanitizeArgs(candidate.args) : [],
    env: transport === 'stdio' ? sanitizeEnv(candidate.env) : {},
    url: transport === 'http' ? normalizeString(candidate.url) : '',
  };
}

export function createMCPStateManager({ rootDirectory }) {
  const serversFilePath = path.join(getWritableDataDirectory(rootDirectory), 'MCPServers.json');
  const fileState = createSingleFileState(serversFilePath, { servers: [] });

  async function readServers() {
    const data = await fileState.read();
    return Array.isArray(data?.servers) ? data.servers.map(sanitizeServerConfig) : [];
  }

  async function writeServers(servers) {
    const safeServers = Array.isArray(servers) ? servers.map(sanitizeServerConfig) : [];
    await fileState.write({ servers: safeServers });
    return safeServers;
  }

  return {
    async listServers() {
      return readServers();
    },

    async saveServer(serverConfig) {
      const server = sanitizeServerConfig(serverConfig);
      const servers = await readServers();
      const existingIndex = servers.findIndex((item) => item.id === server.id);

      if (existingIndex >= 0) {
        servers[existingIndex] = server;
      } else {
        servers.push(server);
      }

      await writeServers(servers);
      return server;
    },

    async removeServer(id) {
      const safeId = sanitizeFileStem(id);
      const servers = await readServers();
      await writeServers(servers.filter((server) => server.id !== safeId));
      return { ok: true };
    },

    async setServerEnabled(id, enabled) {
      const safeId = sanitizeFileStem(id);
      const servers = await readServers();
      const server = servers.find((item) => item.id === safeId);
      if (!server) throw new Error('MCP server not found.');
      server.enabled = Boolean(enabled);
      await writeServers(servers);
      return server;
    },
  };
}
