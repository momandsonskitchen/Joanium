import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
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
// ---------------------------------------------------------------------------

const TICK_INTERVAL_MS = 60_000; // re-check every minute

export function createAgentScheduler({ agentsDirectory, runAgent }) {
  let tickTimer = null;
  let lastTickMinute = -1;

  // ── Internal helpers ─────────────────────────────────────────────────────

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
        const raw  = await readFile(path.join(agentsDirectory, file), 'utf8');
        agents.push(JSON.parse(raw));
      } catch {
        // Skip corrupt files.
      }
    }
    return agents;
  }

  function shouldRunNow(schedule, now) {
    if (!schedule) return false;

    const hh   = now.getHours();
    const mm   = now.getMinutes();
    const dow  = now.getDay(); // 0=Sun … 6=Sat

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

  async function tick() {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();

    // Only fire once per minute even if the timer fires slightly early.
    if (currentMinute === lastTickMinute) return;
    lastTickMinute = currentMinute;

    const agents = await loadAllAgents();
    for (const agent of agents) {
      if (agent.enabled === false) continue;
      if (!agent.schedule || agent.schedule.type === 'startup') continue;
      if (shouldRunNow(agent.schedule, now)) {
        try {
          await runAgent(agent);
        } catch (err) {
          console.error(`[Agents] Failed to run agent "${agent.name}":`, err);
        }
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    async start() {
      // Small delay so the rest of the app (IPC, windows) is fully initialised
      // before agents start making AI calls.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Run startup agents — fire all in parallel so one slow AI call
      // doesn't block the others, and errors are isolated per-agent.
      const agents = await loadAllAgents();
      await Promise.allSettled(
        agents
          .filter((agent) => agent.enabled !== false && agent.schedule?.type === 'startup')
          .map((agent) =>
            runAgent(agent).catch((err) =>
              console.error(`[Agents] Failed to run startup agent "${agent.name}":`, err)
            )
          )
      );

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
