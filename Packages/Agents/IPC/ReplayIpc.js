// ---------------------------------------------------------------------------
// IPC handlers for the Execution Replay feature.
//
// Registered by Index.js alongside the existing agents:* handlers.
//
// Channels:
//   agents:load-run-detail  — load a single run log enriched with steps
//   agents:list-run-ids     — lightweight list of run IDs + metadata
//   agents:replay-run       — re-queue an existing agent for immediate execution
// ---------------------------------------------------------------------------

export function createReplayIpcHandlers({ replayStore, agentStateManager, runAgent }) {
  return [
    {
      channel: 'agents:load-run-detail',
      handler: async (_event, runId) => {
        if (!runId) return null;
        return replayStore.loadRunDetail(String(runId)).catch(() => null);
      },
    },

    {
      channel: 'agents:list-run-ids',
      handler: async () => replayStore.listRunIds().catch(() => []),
    },

    // Replay re-runs the agent with its currently saved prompt/model/schedule.
    // This means "same workflow" executed now against current data, which is
    // the expected semantic: not replaying the identical past response, but
    // re-triggering the exact same agent definition.
    {
      channel: 'agents:replay-run',
      handler: async (_event, runId) => {
        if (!runId) return { ok: false, error: 'Missing runId' };

        // Load the run to find the agentId.
        const detail = await replayStore.loadRunDetail(String(runId)).catch(() => null);
        if (!detail?.agentId) return { ok: false, error: 'Run not found' };

        // Load the current agent definition.
        const agent = await agentStateManager.loadAgent(detail.agentId).catch(() => null);
        if (!agent) return { ok: false, error: 'Agent not found' };

        // Fire-and-forget: the caller just needs to know the replay was queued.
        // The run will appear in Events / the replay viewer on next poll.
        void runAgent(agent).catch((err) => {
          console.error(`[ReplayIpc] Replay of agent "${agent.name}" failed:`, err);
        });

        return { ok: true };
      },
    },
  ];
}
