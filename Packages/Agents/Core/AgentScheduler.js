import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// AgentScheduler — fires agents at the right moment.
//
// Schedule types:
//   startup   — runs once when the app starts.
//   daily     — runs every day at HH:MM.
//   weekly    — runs every [day-of-week] at HH:MM (0=Sun … 6=Sat).
//   weekdays  — runs Mon–Fri at HH:MM.
//   weekends  — runs Sat–Sun at HH:MM.
//
// The caller provides a `runAgent(agent)` callback that performs the actual
// prompt execution.  The scheduler only manages timing; it never touches AI.
//
// Agents are always run sequentially — one at a time — with a 5-second gap
// between each run.  This prevents concurrent requests from hammering the
// provider and triggering 429 rate-limit errors.
// ---------------------------------------------------------------------------

const TICK_INTERVAL_MS   = 60_000; // re-check every minute
const BETWEEN_RUNS_DELAY = 5_000;  // 5 s gap between consecutive agent runs

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAgentScheduler({ agentsDirectory, runAgent, queueAgent }) {
  let tickTimer      = null;
  let lastTickMinute = -1;

  // ── Internal helpers ──────────────────────────────────────────────────────

  async function loadAllAgents() {
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
        const raw = await readFile(path.join(agentsDirectory, file), 'utf8');
        agents.push(JSON.parse(raw));
      } catch {
        // Skip corrupt files.
      }
    }
    return agents;
  }

  function shouldRunNow(schedule, now) {
    if (!schedule) return false;

    const hh  = now.getHours();
    const mm  = now.getMinutes();
    const dow = now.getDay(); // 0=Sun … 6=Sat

    const [schedH, schedM] = (schedule.time ?? '09:00').split(':').map(Number);
    const timeMatches = hh === schedH && mm === schedM;

    switch (schedule.type) {
      case 'daily':    return timeMatches;
      case 'weekly':   return timeMatches && dow === (schedule.day ?? 1);
      case 'weekdays': return timeMatches && dow >= 1 && dow <= 5;
      case 'weekends': return timeMatches && (dow === 0 || dow === 6);
      default:         return false;
    }
  }

  // Run a list of agents one after another with a delay between each to
  // avoid hitting provider rate limits.
  //
  // When queueAgent is provided, agents that will have to wait (index > 0)
  // get a 'queued' log written upfront so the Events feed shows them as
  // pending immediately.  The pre-allocated { runId, logPath, firedAt } is
  // forwarded to runAgent so it can promote the log to 'running' in place.
  async function runSequentially(agents) {
    // Pre-write queued placeholders for every agent that will have to wait.
    const preAllocated = new Map();
    if (typeof queueAgent === 'function' && agents.length > 1) {
      for (let i = 1; i < agents.length; i += 1) {
        try {
          const alloc = await queueAgent(agents[i]);
          if (alloc) preAllocated.set(agents[i].id, alloc);
        } catch {
          // Pre-queuing is best-effort; failures must not block execution.
        }
      }
    }

    for (let i = 0; i < agents.length; i += 1) {
      const agent = agents[i];
      const alloc = preAllocated.get(agent.id) ?? null;
      try {
        await runAgent(agent, alloc);
      } catch (err) {
        console.error(`[Agents] Failed to run agent "${agent.name}":`, err);
      }

      // Pause between runs — skip the delay after the last agent.
      if (i < agents.length - 1) {
        await delay(BETWEEN_RUNS_DELAY);
      }
    }
  }

  async function tick() {
    const now           = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();

    // Only fire once per minute even if the timer drifts slightly.
    if (currentMinute === lastTickMinute) return;
    lastTickMinute = currentMinute;

    const agents = await loadAllAgents();
    const due    = agents.filter((agent) => {
      if (agent.enabled === false) return false;
      if (!agent.schedule || agent.schedule.type === 'startup') return false;
      return shouldRunNow(agent.schedule, now);
    });

    if (due.length > 0) {
      await runSequentially(due);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    async start({ onReady } = {}) {
      // Wait for AgentGateway in the renderer to signal it is ready before
      // dispatching any startup agents.  This replaces the old blind 2-second
      // delay: however long the renderer takes to boot, startup agents will
      // always find a live listener on the other end.
      if (typeof onReady === 'function') {
        await onReady();
      }

      const agents        = await loadAllAgents();
      const startupAgents = agents.filter(
        (agent) => agent.enabled !== false && agent.schedule?.type === 'startup'
      );

      if (startupAgents.length > 0) {
        console.info(`[Agents] Running ${startupAgents.length} startup agent(s) sequentially.`);
        await runSequentially(startupAgents);
      }

      // Start the minute-tick for time-based agents.
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = setInterval(() => void tick(), TICK_INTERVAL_MS);
    },

    stop() {
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
    }
  };
}
