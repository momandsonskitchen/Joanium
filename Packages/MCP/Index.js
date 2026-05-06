import { createMCPStateManager } from './Core/MCPState.js';
import { createMCPRegistry } from './Core/MCPRegistry.js';

export async function createPackage({ rootDirectory }) {
  const stateManager = createMCPStateManager({ rootDirectory });
  const registry = createMCPRegistry();

  const connectEnabledServers = async () => {
    const servers = await stateManager.listServers();
    for (const server of servers) {
      if (!server.enabled) continue;
      try {
        await registry.connect(server);
      } catch {
        console.warn('[MCP] Auto-connect failed for a server.');
      }
    }
  };

  void connectEnabledServers();

  return {
    id: 'MCP',
    ipcHandlers: [
      {
        channel: 'mcp:list-servers',
        handler: async () => {
          const servers = await stateManager.listServers();
          const connected = registry.listConnected();
          return servers.map((server) => ({
            ...server,
            connected: registry.isConnected(server.id),
            toolCount: connected.find((item) => item.id === server.id)?.toolCount ?? 0
          }));
        }
      },
      {
        channel: 'mcp:save-server',
        handler: async (_event, serverConfig) => stateManager.saveServer(serverConfig)
      },
      {
        channel: 'mcp:remove-server',
        handler: async (_event, id) => {
          await registry.disconnect(id);
          return stateManager.removeServer(id);
        }
      },
      {
        channel: 'mcp:set-enabled',
        handler: async (_event, id, enabled) => {
          const server = await stateManager.setServerEnabled(id, enabled);
          if (server.enabled) {
            await registry.connect(server);
          } else {
            await registry.disconnect(server.id);
          }
          return {
            ...server,
            connected: registry.isConnected(server.id)
          };
        }
      },
      {
        channel: 'mcp:connect-server',
        handler: async (_event, id) => {
          const servers = await stateManager.listServers();
          const server = servers.find((item) => item.id === id);
          if (!server) throw new Error('MCP server not found.');
          const result = await registry.connect(server);
          return { ok: true, ...result };
        }
      },
      {
        channel: 'mcp:disconnect-server',
        handler: async (_event, id) => {
          await registry.disconnect(id);
          return { ok: true };
        }
      },
      {
        channel: 'mcp:list-tools',
        handler: async () => registry.listTools()
      },
      {
        channel: 'mcp:call-tool',
        handler: async (_event, serverId, toolName, args) => registry.callTool(serverId, toolName, args)
      }
    ]
  };
}
