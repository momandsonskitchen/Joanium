import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const CLIENT_INFO = Object.freeze({ name: 'Joanium', version: '0.2.0' });
const PROTOCOL_VERSION = '2024-11-05';

class MCPSession extends EventEmitter {
  constructor() {
    super();
    this.nextId = 1;
    this.pending = new Map();
  }

  nextRequestId() {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }

  dispatch(message) {
    if (message?.id !== undefined && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (message?.method) {
      this.emit('notification', message);
    }
  }

  failPending(error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  request(method, params = {}) {
    const id = this.nextRequestId();

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.send({ jsonrpc: '2.0', id, method, params });
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async initialize() {
    return this.request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {}, resources: {} },
      clientInfo: CLIENT_INFO,
    });
  }

  async listTools() {
    const result = await this.request('tools/list', {});
    return Array.isArray(result?.tools) ? result.tools : [];
  }

  async callTool(name, args = {}) {
    return this.request('tools/call', { name, arguments: args });
  }

  send() {
    throw new Error('send() is not implemented.');
  }

  async close() {}
}

class StdioMCPSession extends MCPSession {
  constructor({ command, args = [], env = {} }) {
    super();
    this.closed = false;
    this.closedPromise = new Promise((resolve) => {
      this.resolveClosed = resolve;
    });
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
      shell: process.platform === 'win32',
      windowsHide: true,
    });

    this.outputReader = createInterface({ input: this.process.stdout });
    this.outputReader.on('line', (line) => {
      if (!line.trim()) return;
      try {
        this.dispatch(JSON.parse(line));
      } catch {
        // Ignore non-JSON server output.
      }
    });

    this.process.stderr?.on('data', (chunk) => {
      this.emit('stderr', chunk.toString());
    });

    this.process.once('error', (error) => {
      this.closed = true;
      this.failPending(error);
      this.resolveClosed?.(null);
      this.emit('close', null);
    });

    this.process.on('exit', (code) => {
      this.closed = true;
      this.failPending(new Error(`MCP server exited with code ${code ?? 'unknown'}.`));
      this.resolveClosed?.(code);
      this.emit('close', code);
    });
  }

  send(message) {
    if (this.closed || this.process.stdin?.destroyed) {
      throw new Error('MCP server is not running.');
    }
    this.process.stdin?.write(`${JSON.stringify(message)}\n`);
  }

  async close() {
    if (!this.closed && this.process.exitCode === null) {
      this.process.stdin?.end();
      const killTimer = setTimeout(() => {
        if (!this.closed && this.process.exitCode === null) {
          this.process.kill();
        }
      }, 1000);
      killTimer.unref?.();
    }
    return this.closedPromise;
  }
}

class HttpMCPSession extends MCPSession {
  constructor({ url }) {
    super();
    this.url = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  async request(method, params = {}) {
    const id = this.nextRequestId();
    const response = await fetch(`${this.url}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });

    if (!response.ok) {
      throw new Error(`MCP HTTP ${response.status}: ${await response.text().catch(() => '')}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message ?? JSON.stringify(data.error));
    }
    return data.result;
  }
}

function renderToolResult(result) {
  if (Array.isArray(result?.content)) {
    return result.content
      .map((block) => {
        if (block.type === 'text') return block.text;
        return JSON.stringify(block);
      })
      .join('\n');
  }

  return typeof result === 'string' ? result : JSON.stringify(result);
}

export function createMCPRegistry() {
  const servers = new Map();

  return {
    async connect(config) {
      if (servers.has(config.id)) {
        await this.disconnect(config.id);
      }

      let session;
      if (config.transport === 'http') {
        if (!config.url) throw new Error('HTTP MCP server URL is required.');
        session = new HttpMCPSession({ url: config.url });
      } else {
        if (!config.command) throw new Error('Stdio MCP server command is required.');
        session = new StdioMCPSession({
          command: config.command,
          args: config.args ?? [],
          env: config.env ?? {},
        });
      }

      await session.initialize().catch(() => {});
      const tools = await session.listTools().catch(() => []);
      servers.set(config.id, {
        session,
        tools,
        meta: {
          id: config.id,
          name: config.name,
          transport: config.transport,
        },
      });

      return { tools, toolCount: tools.length };
    },

    async disconnect(id) {
      const entry = servers.get(id);
      if (!entry) return;
      await entry.session.close().catch(() => {});
      servers.delete(id);
    },

    async disconnectAll() {
      for (const id of [...servers.keys()]) {
        await this.disconnect(id);
      }
    },

    isConnected(id) {
      return servers.has(id);
    },

    listConnected() {
      return [...servers.values()].map((entry) => ({
        ...entry.meta,
        toolCount: entry.tools.length,
      }));
    },

    listTools() {
      return [...servers.entries()].flatMap(([serverId, entry]) =>
        entry.tools.map((tool) => ({
          ...tool,
          serverId,
          serverName: entry.meta.name,
        })),
      );
    },

    async callTool(serverId, toolName, args = {}) {
      const entry = servers.get(serverId);
      if (!entry) throw new Error('MCP server is not connected.');
      const hasTool = entry.tools.some((tool) => tool.name === toolName);
      if (!hasTool) throw new Error(`MCP tool "${toolName}" was not found.`);
      return renderToolResult(await entry.session.callTool(toolName, args));
    },
  };
}
