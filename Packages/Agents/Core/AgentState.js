import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';

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
  const agentsDirectory = path.join(rootDirectory, 'Data', 'Agents');

  async function ensureDirectory() {
    await mkdir(agentsDirectory, { recursive: true });
  }

  function agentFilePath(id) {
    return path.join(agentsDirectory, `${sanitizeId(id)}.json`);
  }

  return {
    async saveAgent(agent) {
      if (!agent?.id) return null;
      await ensureDirectory();
      const now = new Date().toISOString();
      const record = {
        id:        agent.id,
        name:      String(agent.name      ?? '').trim(),
        avatar:    agent.avatar            ?? null,
        schedule:  normalizeSchedule(agent.schedule),
        prompt:    String(agent.prompt     ?? '').trim(),
        createdAt: agent.createdAt         ?? now,
        updatedAt: now,
        lastRunAt: agent.lastRunAt         ?? null
      };
      await writeFile(agentFilePath(agent.id), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
      return record;
    },

    async listAgents() {
      let files;
      try {
        files = await readdir(agentsDirectory);
      } catch {
        return [];
      }

      const agents = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw  = await readFile(path.join(agentsDirectory, file), 'utf8');
          const data = JSON.parse(raw);
          agents.push({
            id:        data.id,
            name:      data.name,
            avatar:    data.avatar    ?? null,
            schedule:  data.schedule  ?? { type: 'startup' },
            prompt:    data.prompt,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            lastRunAt: data.lastRunAt ?? null
          });
        } catch {
          // Skip corrupt or unreadable files silently.
        }
      }

      return agents.sort(
        (a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0) - new Date(a.updatedAt ?? a.createdAt ?? 0)
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
        const raw    = await readFile(agentFilePath(id), 'utf8');
        const record = JSON.parse(raw);
        record.lastRunAt = new Date().toISOString();
        record.updatedAt = record.lastRunAt;
        await writeFile(agentFilePath(id), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
        return record;
      } catch {
        return null;
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
}

function normalizeSchedule(raw) {
  if (!raw || typeof raw !== 'object') return { type: 'startup' };

  const validTypes = new Set(['startup', 'daily', 'weekly', 'weekdays', 'weekends']);
  const type = validTypes.has(raw.type) ? raw.type : 'startup';

  if (type === 'startup') return { type };

  const time = normalizeTime(raw.time);
  if (type === 'weekly') {
    const day = typeof raw.day === 'number' && raw.day >= 0 && raw.day <= 6
      ? Math.floor(raw.day)
      : 1; // Monday default
    return { type, time, day };
  }

  return { type, time };
}

function normalizeTime(raw) {
  if (typeof raw !== 'string') return '09:00';
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '09:00';
  const h = String(parseInt(match[1], 10)).padStart(2, '0');
  const m = String(parseInt(match[2], 10)).padStart(2, '0');
  return `${h}:${m}`;
}
