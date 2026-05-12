import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { sanitizeFileStem } from '../../Shared/Storage/SafePath.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

const VALID_TRANSPORTS = new Set(['stdio', 'http']);

function createServerId(name) {
  const stem = sanitizeFileStem(name || 'mcp-server') || 'mcp-server';
  return `${stem}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeArgs(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeString(item)).filter(Boolean);
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
      .map(([key, val]) => [sanitizeString(key), sanitizeString(val)])
      .filter(([key]) => key),
  );
}

export function sanitizeServerConfig(candidate = {}) {
  const transport = VALID_TRANSPORTS.has(candidate.transport) ? candidate.transport : 'stdio';
  const name = sanitizeString(candidate.name) || 'MCP Server';
  const id = sanitizeFileStem(candidate.id) || createServerId(name);

  return {
    id,
    name,
    transport,
    enabled: Boolean(candidate.enabled),
    description: sanitizeString(candidate.description),
    command: transport === 'stdio' ? sanitizeString(candidate.command) : '',
    args: transport === 'stdio' ? sanitizeArgs(candidate.args) : [],
    env: transport === 'stdio' ? sanitizeEnv(candidate.env) : {},
    url: transport === 'http' ? sanitizeString(candidate.url) : '',
  };
}

export function createMCPStateManager({ rootDirectory }) {
  const serversFilePath = path.join(getWritableDataDirectory(rootDirectory), 'MCPServers.json');

  async function readServers() {
    try {
      const raw = await readFile(serversFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.servers) ? parsed.servers.map(sanitizeServerConfig) : [];
    } catch {
      return [];
    }
  }

  async function writeServers(servers) {
    const safeServers = Array.isArray(servers) ? servers.map(sanitizeServerConfig) : [];
    await mkdir(path.dirname(serversFilePath), { recursive: true });
    await writeFile(
      serversFilePath,
      `${JSON.stringify({ servers: safeServers }, null, 2)}\n`,
      'utf8',
    );
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
