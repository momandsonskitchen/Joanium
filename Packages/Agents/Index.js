import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { createAgentStateManager } from './Core/AgentState.js';
import { createAgentScheduler } from './Core/AgentScheduler.js';
import { sanitizeFileStem } from '../Shared/Storage/SafePath.js';
import { createChatStateManager } from '../Chat/Core/ChatState.js';
import { estimateTokens } from '../Shared/UsageTracker/UsageTracker.js';

const agentsPackageDirectory = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// createPackage — standard package contract.
// Registered as a companion of the Chat package so its IPC handlers are
// merged into the Chat window without Chat importing this module directly.
// ---------------------------------------------------------------------------

export async function createPackage({ rootDirectory }) {
  const agentStateManager = createAgentStateManager({ rootDirectory });
  const chatStateManager  = createChatStateManager({ rootDirectory });
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

    await mkdir(runsDirectory, { recursive: true });
    const startedAt   = new Date().toISOString();
    const safeAgentId = sanitizeFileStem(agent.id);
    if (!safeAgentId) return;

    const timestamp = startedAt.replace(/[:.]/g, '-');
    const runId     = `${safeAgentId}-${timestamp}`;
    const logPath   = path.join(runsDirectory, `${safeAgentId}-${timestamp}.json`);

    // Write a 'running' entry immediately so Events shows the agent is active
    // even while the AI call is still in progress.
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

    // ── Call the AI ───────────────────────────────────────────────────────
    let aiResult     = null;
    let status       = 'success';
    let errorMessage = null;

    try {
      const request = {
        messages: [{ role: 'user', content: agent.prompt }]
      };

      // Use the agent's pinned model if set, otherwise fall back to the
      // user's active default provider + model.
      if (agent.model?.providerId && agent.model?.modelId) {
        request.providerId = agent.model.providerId;
        request.modelId    = agent.model.modelId;
      }

      aiResult = await chatStateManager.completeMessage(request);
    } catch (err) {
      status       = 'error';
      errorMessage = err?.message ?? String(err);
      console.error(`[Agents] Agent "${agent.name}" failed:`, err);
    }

    const finishedAt = new Date().toISOString();

    // Overwrite the 'running' entry with the final result.
    await writeFile(logPath, JSON.stringify({
      ...baseLog,
      status,
      finishedAt,
      fullResponse: aiResult?.text          ?? '',
      thinking:     aiResult?.thinking      ?? '',
      provider:     aiResult?.providerLabel ?? null,
      model:        aiResult?.modelLabel    ?? aiResult?.modelId ?? null,
      inputTokens:  estimateTokens(aiResult?.charCountIn  ?? 0),
      outputTokens: estimateTokens(aiResult?.charCountOut ?? 0),
      error:        errorMessage
    }, null, 2), 'utf8');

    console.info(`[Agents] Agent "${agent.name}" ${status} (schedule: ${agent.schedule?.type}).`);
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
