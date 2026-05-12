import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import { BrowserWindow } from 'electron';
import { createAgentStateManager } from './Core/AgentState.js';
import { createAgentScheduler } from './Core/AgentScheduler.js';
import { sanitizeFileStem } from '../Shared/Storage/SafePath.js';
import { getWritableDataDirectory } from '../Shared/Storage/ResourcePaths.js';
import { estimateTokens } from '../Shared/UsageTracker/UsageTracker.js';

const agentsPackageDirectory = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// createPackage — standard package contract.
// Registered as a companion of the Chat package so its IPC handlers are
// merged into the Chat window without Chat importing this module directly.
// ---------------------------------------------------------------------------

export async function createPackage({ rootDirectory }) {
  const agentStateManager = createAgentStateManager({ rootDirectory });
  const agentsDirectory = path.join(getWritableDataDirectory(rootDirectory), 'Agents');
  const avatarsDirectory = path.join(rootDirectory, 'Assets', 'Agents');

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

  // ── Renderer-ready gate ────────────────────────────────────────────────────
  // Startup agents must not fire until AgentGateway has registered its
  // `agents:run-with-tools` listener in the renderer.  AgentGateway calls
  // `agents:renderer-ready` from its `start()` method; the scheduler awaits
  // `waitForRendererReady()` before dispatching any startup agents.
  let resolveRendererReady = null;
  const rendererReadyPromise = new Promise((resolve) => {
    resolveRendererReady = resolve;
  });

  function waitForRendererReady() {
    return rendererReadyPromise;
  }

  function getAppWindow() {
    return BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null;
  }

  function requestAgentRun(agent, logPath) {
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

      const id = randomUUID();
      // 30-minute ceiling — long agents (e.g. workspace audits) need time.
      const timer = setTimeout(() => {
        pendingRuns.delete(id);
        reject(new Error(`Agent "${agent.name}" timed out after 30 minutes.`));
      }, 1_800_000);

      pendingRuns.set(id, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        logPath: logPath ?? null,
      });

      window.webContents.send('agents:run-with-tools', {
        id,
        agentName: agent.name,
        prompt: agent.prompt,
        providerId: agent.model?.providerId ?? null,
        modelId: agent.model?.modelId ?? null,
      });
    });
  }

  // ── Scheduler ─────────────────────────────────────────────────────────────
  const runsDirectory = path.join(agentsDirectory, 'Runs');

  // ── queueAgent ─────────────────────────────────────────────────────────────
  // Pre-writes a 'queued' log for an agent that is waiting in the sequential
  // run queue.  Returns { runId, logPath, firedAt } so runAgent can promote
  // the same file to 'running' without creating a duplicate entry.
  async function queueAgent(agent) {
    await mkdir(runsDirectory, { recursive: true });
    const firedAt = new Date().toISOString();
    const safeAgentId = sanitizeFileStem(agent.id);
    if (!safeAgentId) return null;

    const timestamp = firedAt.replace(/[:.]/g, '-');
    const runId = `${safeAgentId}-${timestamp}`;
    const logPath = path.join(runsDirectory, `${runId}.json`);

    await writeFile(
      logPath,
      JSON.stringify(
        {
          id: runId,
          agentId: agent.id,
          agentName: agent.name,
          agentAvatar: agent.avatar ?? null,
          prompt: agent.prompt,
          schedule: agent.schedule,
          firedAt,
          startedAt: null,
          status: 'queued',
          finishedAt: null,
          fullResponse: '',
          thinking: '',
          provider: null,
          model: null,
          inputTokens: 0,
          outputTokens: 0,
          error: null,
        },
        null,
        2,
      ),
      'utf8',
    );

    return { runId, logPath, firedAt };
  }

  // ── runAgent ───────────────────────────────────────────────────────────────
  // Accepts an optional preAllocated context ({ runId, logPath, firedAt })
  // produced by queueAgent.  When present the existing queued log is promoted
  // to 'running' in place rather than creating a new file.
  async function runAgent(agent, preAllocated = null) {
    await agentStateManager.markAgentRun(agent.id).catch(() => {});

    await mkdir(runsDirectory, { recursive: true });
    const startedAt = new Date().toISOString();
    const safeAgentId = sanitizeFileStem(agent.id);
    if (!safeAgentId) return;

    // Re-use the queued log file when available; otherwise create a new one.
    const runId = preAllocated?.runId ?? `${safeAgentId}-${startedAt.replace(/[:.]/g, '-')}`;
    const logPath = preAllocated?.logPath ?? path.join(runsDirectory, `${runId}.json`);

    const baseLog = {
      id: runId,
      agentId: agent.id,
      agentName: agent.name,
      agentAvatar: agent.avatar ?? null,
      prompt: agent.prompt,
      schedule: agent.schedule,
      firedAt: preAllocated?.firedAt ?? startedAt,
      startedAt,
    };

    // Write a 'running' entry so Events shows the agent is active while the
    // tool loop is in progress.
    await writeFile(
      logPath,
      JSON.stringify(
        {
          ...baseLog,
          status: 'running',
          finishedAt: null,
          fullResponse: '',
          thinking: '',
          provider: null,
          model: null,
          inputTokens: 0,
          outputTokens: 0,
          error: null,
        },
        null,
        2,
      ),
      'utf8',
    ).catch(() => {});

    // ── Delegate to the renderer tool loop ────────────────────────────────
    let aiResult = null;
    let status = 'success';
    let errorMessage = null;

    try {
      aiResult = await requestAgentRun(agent, logPath);
    } catch (err) {
      status = 'error';
      errorMessage = err?.message ?? String(err);
      console.error(`[Agents] Agent "${agent.name}" failed:`, err);
    }

    const finishedAt = new Date().toISOString();

    await writeFile(
      logPath,
      JSON.stringify(
        {
          ...baseLog,
          status,
          finishedAt,
          fullResponse: aiResult?.text ?? '',
          thinking: aiResult?.thinking ?? '',
          provider: aiResult?.providerLabel ?? null,
          model: aiResult?.modelLabel ?? null,
          inputTokens: estimateTokens(aiResult?.charCountIn ?? 0),
          outputTokens: estimateTokens(aiResult?.charCountOut ?? 0),
          error: errorMessage,
        },
        null,
        2,
      ),
      'utf8',
    );

    console.info(`[Agents] Agent "${agent.name}" ${status} (schedule: ${agent.schedule?.type}).`);
  }

  const scheduler = createAgentScheduler({ agentsDirectory, runAgent, queueAgent });

  // Recover any runs that were interrupted by the app closing unexpectedly.
  await agentStateManager
    .recoverInterruptedRuns()
    .catch((err) => console.error('[Agents] Failed to recover interrupted runs:', err));

  scheduler
    .start({ onReady: waitForRendererReady })
    .catch((err) => console.error('[Agents] Scheduler start error:', err));

  // ── IPC Handlers ──────────────────────────────────────────────────────────

  return {
    id: 'Agents',
    ipcHandlers: [
      // ── Renderer-ready handshake ─────────────────────────────────────────
      // AgentGateway calls this once its `agents:run-with-tools` listener is
      // live.  Resolving here unblocks the startup-agent queue in the
      // scheduler, guaranteeing the event is never sent into a void.
      {
        channel: 'agents:renderer-ready',
        handler: () => {
          resolveRendererReady?.();
          return { ok: true };
        },
      },

      // ── Tool-loop reply from AgentGateway (renderer) ─────────────────────
      {
        channel: 'agents:tool-reply',
        handler: (_event, id, result) => {
          const pending = pendingRuns.get(id);
          if (!pending) return { ok: false };
          pendingRuns.delete(id);
          pending.resolve(result);
          return { ok: true };
        },
      },

      // ── Streaming progress from AgentGateway (renderer) ──────────────────
      // Written into the run log so the Events panel picks it up on its
      // next poll without any extra IPC wiring on the renderer side.
      {
        channel: 'agents:progress',
        handler: async (_event, id, { text, toolName, depth } = {}) => {
          const pending = pendingRuns.get(id);
          if (!pending?.logPath) return { ok: false };
          try {
            const raw = await readFile(pending.logPath, 'utf8');
            const log = JSON.parse(raw);
            await writeFile(
              pending.logPath,
              JSON.stringify(
                {
                  ...log,
                  fullResponse: text ?? '',
                  streamTool: toolName ?? null,
                  streamDepth: depth ?? 0,
                },
                null,
                2,
              ),
              'utf8',
            );
            return { ok: true };
          } catch {
            return { ok: false };
          }
        },
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
              filePath: path.join(avatarsDirectory, filename),
            }));
        },
      },
      {
        channel: 'agents:save-agent',
        handler: async (_event, agent) => agentStateManager.saveAgent(agent),
      },
      {
        channel: 'agents:list-agents',
        handler: async () => agentStateManager.listAgents(),
      },
      {
        channel: 'agents:load-agent',
        handler: async (_event, id) => agentStateManager.loadAgent(id),
      },
      {
        channel: 'agents:delete-agent',
        handler: async (_event, id) => agentStateManager.deleteAgent(id),
      },
      {
        channel: 'agents:run-agent',
        handler: async (_event, id) => {
          const agent = await agentStateManager.loadAgent(id);
          await runAgent(agent);
          return { success: true };
        },
      },
      {
        channel: 'agents:list-runs',
        handler: async () => agentStateManager.listRuns(),
      },
      {
        channel: 'agents:clear-runs',
        handler: async () => agentStateManager.clearRuns(),
      },
    ],
  };
}
