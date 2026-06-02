import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

// ---------------------------------------------------------------------------
// ReplayStore — derives step-level execution detail from a saved run log.
//
// The run log (written by Index.js / AgentGateway) records the raw
// fullResponse string produced by the tool loop.  The tool loop embeds tool
// invocations as fenced code blocks inside that string.  ReplayStore parses
// those blocks into discrete steps so the renderer can display them in a
// timeline without any new data being written during a live run.
//
// Step shape:
//   {
//     index:      number,         — 1-based display index
//     toolName:   string | null,  — null for the final text response
//     toolInput:  object | null,
//     toolOutput: string | null,  — raw text extracted from result prefix
//     timestamp:  string | null,  — ISO; estimated from start/end + index
//     durationMs: number | null,
//     type:       'tool' | 'response',
//   }
// ---------------------------------------------------------------------------

const TOOL_BLOCK_RE = /```(?:joanium-tool|joanium-terminal)\s*([\s\S]*?)```/gi;

// Spread total duration evenly across steps to produce plausible per-step
// timestamps.  Real per-step timing is not persisted in the current log
// schema, so this is the best approximation available without a schema change.
function distributeTimestamps(startIso, finishIso, count) {
  if (!startIso || !finishIso || count <= 0) return Array(count).fill(null);

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(finishIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return Array(count).fill(startIso);
  }

  const stepMs = (endMs - startMs) / count;
  return Array.from({ length: count }, (_, i) => new Date(startMs + stepMs * i).toISOString());
}

// Parse every joanium-tool / joanium-terminal block from the raw response.
// Returns an array of { toolName, toolInput, rawBlock }.
function extractToolBlocks(fullResponse) {
  const blocks = [];
  const re = new RegExp(TOOL_BLOCK_RE.source, 'gi');
  let match;

  while ((match = re.exec(fullResponse)) !== null) {
    try {
      const payload = JSON.parse(match[1].trim());
      blocks.push({
        toolName: String(payload.tool ?? 'unknown'),
        toolInput: payload.parameters ?? payload.arguments ?? null,
        rawBlock: match[0],
      });
    } catch {
      // Malformed block — skip rather than crash.
    }
  }

  return blocks;
}

// Strip all tool blocks from a response string to get the visible text.
function stripToolBlocks(text) {
  return text.replace(TOOL_BLOCK_RE, '').trim();
}

// Build the steps array from a loaded run record.
export function deriveSteps(run) {
  const fullResponse = String(run.fullResponse ?? '');
  const blocks = extractToolBlocks(fullResponse);
  const visibleText = stripToolBlocks(fullResponse);

  // Total step count: one per tool call + one for the final text response (if
  // any visible content exists after stripping tool blocks).
  const hasResponse = visibleText.length > 0;
  const totalSteps = blocks.length + (hasResponse ? 1 : 0);
  const timestamps = distributeTimestamps(run.startedAt, run.finishedAt, totalSteps);

  const startMs = run.startedAt ? new Date(run.startedAt).getTime() : null;
  const finishMs = run.finishedAt ? new Date(run.finishedAt).getTime() : null;
  const totalMs =
    Number.isFinite(startMs) && Number.isFinite(finishMs) ? Math.max(0, finishMs - startMs) : null;

  const perStepMs = totalSteps > 0 && totalMs !== null ? Math.round(totalMs / totalSteps) : null;

  const steps = blocks.map((block, i) => {
    // Use the persisted terminal record (if available) for real tool output
    // and status. Falls back to null when terminals weren't captured.
    const terminal = Array.isArray(run.terminals) ? (run.terminals[i] ?? null) : null;
    return {
      index: i + 1,
      type: 'tool',
      toolName: block.toolName,
      toolInput: block.toolInput,
      toolOutput: terminal?.output ?? null,
      status: terminal?.status ?? 'completed',
      timestamp: timestamps[i],
      durationMs: perStepMs,
    };
  });

  if (hasResponse) {
    steps.push({
      index: blocks.length + 1,
      type: 'response',
      toolName: null,
      toolInput: null,
      toolOutput: visibleText,
      timestamp: timestamps[blocks.length] ?? run.finishedAt ?? null,
      durationMs: perStepMs,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// createReplayStore — factory; exposes loadRunDetail and listRunIds.
// ---------------------------------------------------------------------------

export function createReplayStore({ rootDirectory }) {
  const agentsDir = path.join(getWritableDataDirectory(rootDirectory), 'Agents');
  const runsDir = path.join(agentsDir, 'Runs');

  async function readRunFile(runId) {
    // runId is already the filename stem (no path traversal risk after
    // sanitization by AgentState, but we validate anyway).
    if (!runId || /[/\\]/.test(runId)) return null;
    const filePath = path.join(runsDir, `${runId}.json`);
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  return {
    // Returns the run record augmented with a `steps` array.
    async loadRunDetail(runId) {
      const run = await readRunFile(runId);
      if (!run) return null;
      return { ...run, steps: deriveSteps(run) };
    },

    // Returns a list of { runId, agentId, agentName, startedAt, status }
    // sorted newest-first — lightweight metadata only, no steps derived.
    async listRunIds() {
      let files;
      try {
        files = await readdir(runsDir);
      } catch {
        return [];
      }

      const results = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await readFile(path.join(runsDir, file), 'utf8');
          const run = JSON.parse(raw);
          results.push({
            runId: run.id ?? file.replace(/\.json$/, ''),
            agentId: run.agentId ?? '',
            agentName: run.agentName ?? '',
            startedAt: run.startedAt ?? run.firedAt ?? null,
            status: run.status ?? 'success',
          });
        } catch {
          // Skip corrupt files.
        }
      }

      return results.sort((a, b) => {
        const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
      });
    },
  };
}
