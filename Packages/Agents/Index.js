import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { BrowserWindow } from 'electron';
import { createAgentStateManager } from './Core/AgentState.js';
import { createAgentScheduler } from './Core/AgentScheduler.js';
import { sanitizeFileStem } from '../Shared/Storage/SafePath.js';
import { estimateTokens } from '../Shared/UsageTracker/UsageTracker.js';

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

  // ── Renderer-delegated tool loop ───────────────────────────────────────────
  // The agentic tool loop (parse tool blocks → execute via IPC → loop back)
  // lives entirely in the renderer process. The main process cannot call tool
  // executors directly without violating the package isolation rule.
  //
  // Pattern mirrors how Channels works:
  //   1. Main process sends `agents:run-with-tools` to the renderer window.
  //   2. AgentGateway (renderer) runs the bounded tool loop and calls
  //      `agents:tool-reply` when done.
  //   3. The pending-promise map below resolves the awaiting runAgent call.

  const pendingRuns = new Map();

  function getAppWindow() {
    return BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null;
  }

  function requestAgentRun(agent) {
    return new Promise((resolve, reject) => {
      const window = getAppWindow();
      if (!window) {
        reject(new Error('App window is not available — cannot run agent tool loop.'));
        return;
      }

      if (pendingRuns.size >= 20) {
        reject(new Error('Agent run queue is full. Too many agents running concurrently.'));
        return;
      }

      const id    = randomUUID();
      // 30-minute ceiling — long agents (e.g. workspace audits) need time.
      const timer = setTimeout(() => {
        pendingRuns.delete(id);
        reject(new Error(`Agent "${agent.name}" timed out after 30 minutes.`));
      }, 1_800_000);

      pendingRuns.set(id, {
        resolve: (result) => { clearTimeout(timer); resolve(result); },
        reject:  (error)  => { clearTimeout(timer); reject(error);  }
      });

      window.webContents.send('agents:run-with-tools', {
        id,
        agentName:  agent.name,
        prompt:     agent.prompt,
        providerId: agent.model?.providerId ?? null,
        modelId:    agent.model?.modelId    ?? null
      });
    });
  }

  // ── Scheduler ─────────────────────────────────────────────────────────────
  const runsDirectory = path.join(agentsDirectory, 'Runs');

  async function runAgent(agent) {
    await agentStateManager.markAgentRun(agent.id).catch(() => {});

    await mkdir(runsDirectory, { recursive: true });
    const startedAt   = new Date().toISOString();
    const safeAgentId = sanitizeFileStem(agent.id);
    if (!safeAgentId) return;

    const timestamp = startedAt.replace(/[:.]/g, '-');
    const runId     = `${safeAgentId}-${timestamp}`;
    const logPath   = path.join(runsDirectory, `${safeAgentId}-${timestamp}.json`);

    const baseLog = {
      id:          runId,
      agentId:     agent.id,
      agentName:   agent.name,
      agentAvatar: agent.avatar ?? null,
      prompt:      agent.prompt,
      schedule:    agent.schedule,
      firedAt:     startedAt,
      startedAt
    };

    // Write a 'running' entry so Events shows the agent is active while the
    // tool loop is in progress.
    await writeFile(logPath, JSON.stringify({
      ...baseLog,
      status:       'running',
      finishedAt:   null,
      fullResponse: '',
      thinking:     '',
      provider:     null,
      model:        null,
      inputTokens:  0,
      outputTokens: 0,
      error:        null
    }, null, 2), 'utf8').catch(() => {});

    // ── Delegate to the renderer tool loop ────────────────────────────────
    let aiResult     = null;
    let status       = 'success';
    let errorMessage = null;

    try {
      aiResult = await requestAgentRun(agent);
    } catch (err) {
      status       = 'error';
      errorMessage = err?.message ?? String(err);
      console.error(`[Agents] Agent "${agent.name}" failed:`, err);
    }

    const finishedAt = new Date().toISOString();

    await writeFile(logPath, JSON.stringify({
      ...baseLog,
      status,
      finishedAt,
      fullResponse: aiResult?.text          ?? '',
      thinking:     aiResult?.thinking      ?? '',
      provider:     aiResult?.providerLabel ?? null,
      model:        aiResult?.modelLabel    ?? null,
      inputTokens:  estimateTokens(aiResult?.charCountIn  ?? 0),
      outputTokens: estimateTokens(aiResult?.charCountOut ?? 0),
      error:        errorMessage
    }, null, 2), 'utf8');

    console.info(`[Agents] Agent "${agent.name}" ${status} (schedule: ${agent.schedule?.type}).`);
  }

  const scheduler = createAgentScheduler({ agentsDirectory, runAgent });

  scheduler.start().catch((err) =>
    console.error('[Agents] Scheduler start error:', err)
  );

  // ── IPC Handlers ──────────────────────────────────────────────────────────

  return {
    id: 'Agents',
    ipcHandlers: [
      // ── Tool-loop reply from AgentGateway (renderer) ─────────────────────
      {
        channel: 'agents:tool-reply',
        handler: (_event, id, result) => {
          const pending = pendingRuns.get(id);
          if (!pending) return { ok: false };
          pendingRuns.delete(id);
          pending.resolve(result);
          return { ok: true };
        }
      },

      // ── Standard agent CRUD + run / list operations ──────────────────────
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
      },
      {
        channel: 'agents:list-runs',
        handler: async () => agentStateManager.listRuns()
      },
      {
        channel: 'agents:clear-runs',
        handler: async () => agentStateManager.clearRuns()
      }
    ]
  };
}
