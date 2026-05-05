import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { createAgentStateManager } from './Core/AgentState.js';
import { createAgentScheduler } from './Core/AgentScheduler.js';

const agentsPackageDirectory = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// createPackage — standard package contract.
// Registered as a companion of the Chat package so its IPC handlers are
// merged into the Chat window without Chat importing this module directly.
// ---------------------------------------------------------------------------

export async function createPackage({ rootDirectory }) {
  const agentStateManager = createAgentStateManager({ rootDirectory });
  const agentsDirectory   = path.join(rootDirectory, 'Data', 'Agents');
  const avatarsDirectory  = path.join(rootDirectory, 'Assets', 'Agents');

  // Image extensions we accept for avatars.
  const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

  // ── Scheduler ─────────────────────────────────────────────────────────────
  // The scheduler is started once. It calls runAgent() for each triggered agent.
  // runAgent stores a simple run-log in Data/Agents/Runs/ so the result is
  // persisted even when the renderer is not in the Agents view.
  const runsDirectory = path.join(agentsDirectory, 'Runs');

  async function runAgent(agent) {
    // Mark last run time in the agent record.
    await agentStateManager.markAgentRun(agent.id).catch(() => {});

    // Write a run-log entry so we have an audit trail.
    await mkdir(runsDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath   = path.join(runsDirectory, `${agent.id}-${timestamp}.json`);
    await writeFile(logPath, JSON.stringify({
      agentId:   agent.id,
      agentName: agent.name,
      prompt:    agent.prompt,
      firedAt:   new Date().toISOString(),
      schedule:  agent.schedule
    }, null, 2), 'utf8');

    console.info(`[Agents] Agent "${agent.name}" fired (schedule: ${agent.schedule?.type}).`);
  }

  const scheduler = createAgentScheduler({ agentsDirectory, runAgent });

  // Start the scheduler asynchronously — do not block package registration.
  scheduler.start().catch((err) =>
    console.error('[Agents] Scheduler start error:', err)
  );

  // ── IPC Handlers ──────────────────────────────────────────────────────────

  return {
    id: 'Agents',
    ipcHandlers: [
      {
        channel: 'agents:list-avatars',
        handler: async () => {
          let files;
          try {
            files = await readdir(avatarsDirectory);
          } catch {
            return [];
          }

          return files
            .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
            .map((filename) => ({
              filename,
              filePath: path.join(avatarsDirectory, filename)
            }));
        }
      },
      {
        channel: 'agents:save-agent',
        handler: async (_event, agent) => agentStateManager.saveAgent(agent)
      },
      {
        channel: 'agents:list-agents',
        handler: async () => agentStateManager.listAgents()
      },
      {
        channel: 'agents:load-agent',
        handler: async (_event, id) => agentStateManager.loadAgent(id)
      },
      {
        channel: 'agents:delete-agent',
        handler: async (_event, id) => agentStateManager.deleteAgent(id)
      },
      {
        channel: 'agents:run-agent',
        handler: async (_event, id) => {
          const agent = await agentStateManager.loadAgent(id);
          await runAgent(agent);
          return { success: true };
        }
      }
    ]
  };
}
