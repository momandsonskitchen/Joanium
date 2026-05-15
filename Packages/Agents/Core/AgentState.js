import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink, rm } from 'node:fs/promises';
import { sanitizeFileStem } from '../../Shared/Storage/SafePath.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { readJsonDirectory } from '../Utils.js';

// ---------------------------------------------------------------------------
// AgentState — CRUD for user-defined scheduled agents.
// Agents are stored as individual JSON files under Data/Agents/.
//
// Each agent has:
//   id, name, avatar, schedule, prompt, createdAt, updatedAt, lastRunAt
//
// Schedule shape:
//   { type: 'startup' | 'daily' | 'weekly' | 'weekdays' | 'weekends',
//     time?: 'HH:MM',   — omitted for startup
//     day?:  0–6        — only for weekly (0 = Sunday … 6 = Saturday)
//   }
// ---------------------------------------------------------------------------

export function createAgentStateManager({ rootDirectory }) {
  const agentsDirectory = path.join(getWritableDataDirectory(rootDirectory), 'Agents');
  const runsDirectory = path.join(agentsDirectory, 'Runs');
  const avatarsDirectory = path.join(rootDirectory, 'Assets', 'Agents');

  async function ensureDirectory() {
    await mkdir(agentsDirectory, { recursive: true });
  }

  function agentFilePath(id) {
    const safeId = sanitizeFileStem(id);
    if (!safeId) {
      throw new Error('A valid agent id is required.');
    }

    return path.join(agentsDirectory, `${safeId}.json`);
  }

  return {
    async saveAgent(agent) {
      if (!agent?.id) return null;
      const safeId = sanitizeFileStem(agent.id);
      if (!safeId) return null;

      await ensureDirectory();
      const now = new Date().toISOString();
      const record = {
        id: safeId,
        name: String(agent.name ?? '').trim(),
        avatar: agent.avatar ?? null,
        schedule: normalizeSchedule(agent.schedule),
        model: normalizeModel(agent.model),
        prompt: String(agent.prompt ?? '').trim(),
        enabled: agent.enabled ?? true,
        createdAt: agent.createdAt ?? now,
        updatedAt: now,
        lastRunAt: agent.lastRunAt ?? null,
      };
      await writeFile(agentFilePath(safeId), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
      return record;
    },

    async listAgents() {
      const agents = await readJsonDirectory(agentsDirectory, (data) => ({
        id: data.id,
        name: data.name,
        avatar: data.avatar ?? null,
        schedule: data.schedule ?? { type: 'startup' },
        model: data.model ?? null,
        prompt: data.prompt,
        enabled: data.enabled ?? true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        lastRunAt: data.lastRunAt ?? null,
      }));

      return agents.sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt ?? 0) - new Date(a.updatedAt ?? a.createdAt ?? 0),
      );
    },

    async loadAgent(id) {
      const raw = await readFile(agentFilePath(id), 'utf8');
      return JSON.parse(raw);
    },

    async deleteAgent(id) {
      await unlink(agentFilePath(id));
    },

    async markAgentRun(id) {
      try {
        const raw = await readFile(agentFilePath(id), 'utf8');
        const record = JSON.parse(raw);
        record.lastRunAt = new Date().toISOString();
        record.updatedAt = record.lastRunAt;
        await writeFile(agentFilePath(id), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
        return record;
      } catch {
        return null;
      }
    },

    async listRuns() {
      let files;
      try {
        files = await readdir(runsDirectory);
      } catch {
        return [];
      }

      // Build agentId → avatar filename map so runs can resolve their icon path.
      const agentAvatarMap = new Map();
      try {
        const agentFiles = await readdir(agentsDirectory);
        for (const agentFile of agentFiles) {
          if (!agentFile.endsWith('.json')) continue;
          try {
            const raw = await readFile(path.join(agentsDirectory, agentFile), 'utf8');
            const agent = JSON.parse(raw);
            if (agent.id && agent.avatar) {
              agentAvatarMap.set(agent.id, agent.avatar);
            }
          } catch {
            /* skip corrupt agent file */
          }
        }
      } catch {
        /* agents directory unreadable */
      }

      const runs = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await readFile(path.join(runsDirectory, file), 'utf8');
          const run = JSON.parse(raw);
          const avatarFilename = agentAvatarMap.get(run.agentId) ?? run.agentAvatar ?? null;
          runs.push({
            id: run.id ?? file.replace(/\.json$/i, ''),
            agentId: run.agentId ?? '',
            agentName: run.agentName ?? 'Agent',
            agentAvatarPath: avatarFilename ? path.join(avatarsDirectory, avatarFilename) : null,
            prompt: run.prompt ?? '',
            status: run.status ?? 'success',
            startedAt: run.startedAt ?? run.firedAt ?? run.timestamp ?? null,
            finishedAt: run.finishedAt ?? run.firedAt ?? run.timestamp ?? null,
            schedule: run.schedule ?? null,
            trigger: run.trigger ?? run.schedule ?? null,
            summary: run.summary ?? run.prompt ?? '',
            fullResponse: run.fullResponse ?? '',
            error: run.error ?? null,
            provider: run.provider ?? null,
            model: run.model ?? null,
            inputTokens: run.inputTokens ?? 0,
            outputTokens: run.outputTokens ?? 0,
            source: run.source ?? 'agent',
          });
        } catch {
          // Skip corrupt run logs.
        }
      }

      return runs.sort(
        (a, b) =>
          new Date(b.startedAt ?? b.finishedAt ?? 0) - new Date(a.startedAt ?? a.finishedAt ?? 0),
      );
    },

    async clearRuns() {
      await rm(runsDirectory, { recursive: true, force: true });
      await mkdir(runsDirectory, { recursive: true });
      return { ok: true };
    },

    // -------------------------------------------------------------------------
    // recoverInterruptedRuns — called once at startup to fix up any run logs
    // left in a 'running' or 'queued' state because the app was closed while
    // an agent was active or waiting in the queue.
    // -------------------------------------------------------------------------
    async recoverInterruptedRuns() {
      let files;
      try {
        await mkdir(runsDirectory, { recursive: true });
        files = await readdir(runsDirectory);
      } catch {
        return;
      }

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(runsDirectory, file);
        try {
          const raw = await readFile(filePath, 'utf8');
          const run = JSON.parse(raw);

          if (run.status !== 'running' && run.status !== 'queued') continue;

          const reason =
            run.status === 'queued'
              ? 'App closed before agent could start.'
              : 'App closed while agent was running.';

          const recovered = {
            ...run,
            status: 'error',
            finishedAt: run.finishedAt ?? new Date().toISOString(),
            error: reason,
          };

          await writeFile(filePath, `${JSON.stringify(recovered, null, 2)}\n`, 'utf8');
        } catch {
          // Skip corrupt or unreadable run files.
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSchedule(raw) {
  if (!raw || typeof raw !== 'object') return { type: 'startup' };

  const validTypes = new Set(['startup', 'daily', 'weekly', 'weekdays', 'weekends']);
  const type = validTypes.has(raw.type) ? raw.type : 'startup';

  if (type === 'startup') return { type };

  const time = normalizeTime(raw.time);
  if (type === 'weekly') {
    const day =
      typeof raw.day === 'number' && raw.day >= 0 && raw.day <= 6 ? Math.floor(raw.day) : 1; // Monday default
    return { type, time, day };
  }

  return { type, time };
}

function normalizeModel(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const providerId = typeof raw.providerId === 'string' ? raw.providerId.trim() : '';
  const modelId = typeof raw.modelId === 'string' ? raw.modelId.trim() : '';
  if (!providerId || !modelId) return null;
  return { providerId, modelId };
}

function normalizeTime(raw) {
  if (typeof raw !== 'string') return '09:00';
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '09:00';
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return '09:00';
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  return `${h}:${m}`;
}
