// ---------------------------------------------------------------------------
// IPC handlers for the Execution Replay feature.
//
// Registered by Index.js alongside the existing agents:* handlers.
//
// Channels:
//   agents:load-run-detail  — load a single run log enriched with steps
//   agents:list-run-ids     — lightweight list of run IDs + metadata
// ---------------------------------------------------------------------------

export function createReplayIpcHandlers({ replayStore }) {
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
  ];
}
