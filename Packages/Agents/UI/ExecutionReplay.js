import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createTerminalCallCard } from '../../Shared/TerminalCallCard/TerminalCallCard.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';

// ---------------------------------------------------------------------------
// createExecutionReplay
//
// Reusable factory that builds a self-contained Execution Replay viewer.
// Call build() to get the root DOM element; call load(runId) to populate it.
//
// Features:
//   - Timeline view with one node per step
//   - Each step shows: timestamp, tool name, connector icon, tool input,
//     tool output, LLM used, token usage, duration
//   - Reasoning (thinking) block in the header when present
//   - Expand / collapse per step via <details>
//   - "Replay Execution" button that re-runs the same agent via IPC
// ---------------------------------------------------------------------------

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatDuration(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

// ── Small DOM helpers ────────────────────────────────────────────────────────

function createMetaChip(label, value) {
  if (!value && value !== 0) return null;
  const chip = createElement('div', 'replay-meta-chip');
  chip.append(
    createElement('span', 'replay-meta-chip__label', label),
    createElement('span', 'replay-meta-chip__value', String(value)),
  );
  return chip;
}

// ── Reasoning block ──────────────────────────────────────────────────────────

/**
 * Builds a collapsible reasoning/thinking block styled to match the chat's
 * thinking block — using the same CSS classes so it inherits theme colours.
 */
function createReasoningBlock(thinkingText, strings) {
  const wrap = document.createElement('details');
  wrap.className = 'chat-message__thinking replay__thinking';

  const summary = document.createElement('summary');
  summary.className = 'chat-message__thinking-summary';
  summary.append(
    createIcon('thinking', 'chat-message__thinking-icon'),
    createElement('span', 'chat-message__thinking-label', strings.replay.reasonedLabel),
  );
  wrap.append(summary);

  const body = createElement('div', 'chat-message__thinking-body replay__thinking-body');
  body.append(createElement('p', 'chat-message__thinking-text', thinkingText));
  wrap.append(body);
  return wrap;
}

// ── Tool block ─────────────────────────────────────────────────────────────

function createToolCard(step) {
  const outputText = [
    step.toolInput ? JSON.stringify(step.toolInput, null, 2) : '',
    step.toolOutput,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  return createTerminalCallCard({
    status: step.status,
    iconToolName: step.toolName,
    label: step.toolName,
    command: step.toolName,
    statusLabel: step.status,
    output: outputText,
  });
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createExecutionReplay(strings) {
  let rootEl = null;
  let headerEl = null;
  let emptyEl = null;

  // ── Build skeleton DOM ───────────────────────────────────────────────────

  function build() {
    rootEl = createElement('div', 'replay');
    headerEl = createElement('div', 'replay__header');

    emptyEl = createElement('div', 'replay__empty', strings.replay.empty);
    emptyEl.hidden = true;

    rootEl.append(headerEl, emptyEl);

    attachCustomScrollbar(rootEl, headerEl, { right: 8, top: 24, bottom: 24, minThumb: 24 });

    renderEmpty();
    return rootEl;
  }

  // ── Render states ────────────────────────────────────────────────────────

  function renderEmpty() {
    headerEl.style.display = 'none';
    headerEl.replaceChildren();
    emptyEl.hidden = false;
    emptyEl.textContent = strings.replay.empty;
  }

  function renderLoading() {
    headerEl.style.display = 'none';
    headerEl.replaceChildren();
    emptyEl.hidden = false;
    emptyEl.textContent = strings.replay.loading;
  }

  function renderRun(run) {
    emptyEl.hidden = true;
    headerEl.style.display = '';
    headerEl.replaceChildren();

    const rawSteps = Array.isArray(run.steps) ? run.steps : [];
    let steps = rawSteps.filter((s) => s.type !== 'response');

    // ── Augment steps with terminal data ─────────────────────────────────────
    const terminals = Array.isArray(run.terminals) ? run.terminals : [];
    steps = steps.map((step, i) => {
      const terminal = terminals[i];
      if (terminal) {
        if (!step.toolOutput && terminal.error) step.toolOutput = String(terminal.error);
        if (terminal.status === 'failed' || terminal.status === 'error') step.status = 'error';
      }
      return step;
    });

    if (terminals.length > steps.length) {
      for (let i = steps.length; i < terminals.length; i++) {
        const terminal = terminals[i];
        steps.push({
          index: i + 1,
          type: 'tool',
          toolName: terminal.command || 'unknown',
          toolInput: null,
          toolOutput: terminal.error ? String(terminal.error) : (terminal.output ?? null),
          status:
            terminal.status === 'failed' || terminal.status === 'error'
              ? 'error'
              : terminal.status || 'completed',
          timestamp: run.startedAt,
          durationMs: null,
        });
      }
    }

    // ── Meta chips ───────────────────────────────────────────────────────────
    const metaRowEl = createElement('div', 'replay__meta');
    const totalMs =
      run.startedAt && run.finishedAt
        ? Math.max(0, new Date(run.finishedAt) - new Date(run.startedAt))
        : null;

    [
      createMetaChip(strings.replay.metaStarted, formatDate(run.startedAt)),
      createMetaChip(strings.replay.metaFinished, formatDate(run.finishedAt)),
      run.provider ? createMetaChip(strings.replay.metaProvider, run.provider) : null,
      run.model ? createMetaChip(strings.replay.metaModel, run.model) : null,
      createMetaChip(
        strings.replay.metaTokens,
        run.inputTokens || run.outputTokens
          ? `${run.inputTokens ?? 0} in / ${run.outputTokens ?? 0} out`
          : null,
      ),
      createMetaChip(strings.replay.metaDuration, formatDuration(totalMs)),
    ]
      .filter(Boolean)
      .forEach((chip) => metaRowEl.append(chip));

    // Append the status badge to the end of the meta row, pushed to the right
    const statusBadge = createElement(
      'span',
      `replay-status replay-status--${run.status ?? 'success'}`,
      strings.replay.status[run.status] ?? run.status ?? '',
    );
    Object.assign(statusBadge.style, {
      marginLeft: 'auto',
      alignSelf: 'flex-start',
      marginTop: '6px',
    });
    metaRowEl.append(statusBadge);

    headerEl.append(metaRowEl);

    // 1. Prompt summary ───────────────────────────────────────────────────────
    if (run.prompt) {
      const promptWrap = createElement('div', 'replay__prompt-wrap');
      promptWrap.append(
        createElement('span', 'replay__prompt-label', strings.replay.metaPrompt),
        createElement('span', 'replay__prompt-text', run.prompt),
      );
      headerEl.append(promptWrap);
    }

    // 2. Reasoning block ──────────────────────────────────────────────────────
    if (run.thinking && String(run.thinking).trim()) {
      headerEl.append(createReasoningBlock(String(run.thinking).trim(), strings));
    }

    // 3. Tools used ───────────────────────────────────────────────────────────
    if (steps.length > 0) {
      const toolsContainer = createElement('div', 'replay__tools-container');
      Object.assign(toolsContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '8px',
      });

      for (const step of steps) {
        toolsContainer.append(createToolCard(step));
      }
      headerEl.append(toolsContainer);
    }

    // 4. Final Response ───────────────────────────────────────────────────────
    let finalResponseText = run.visibleResponse;
    if (!finalResponseText && run.fullResponse) {
      // Fallback if ReplayStore isn't parsing visibleResponse properly yet
      const re = /```(?:joanium-tool|joanium-terminal)\s*[\s\S]*?```/gi;
      finalResponseText = String(run.fullResponse).replace(re, '').trim();
    }

    if (finalResponseText) {
      const responseWrap = createElement('div', 'replay__response-wrap');
      Object.assign(responseWrap.style, {
        marginTop: '8px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(170, 134, 104, 0.1)',
      });
      responseWrap.append(
        createElement('span', 'replay__prompt-label', 'FINAL RESPONSE'),
        createElement('div', 'replay__response-text', finalResponseText),
      );
      headerEl.append(responseWrap);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    build,

    async load(runId) {
      if (!rootEl) return;
      renderLoading();
      try {
        const run = await invokeIpc('agents:load-run-detail', runId);
        if (!run) {
          renderEmpty();
          return;
        }
        renderRun(run);
      } catch {
        renderEmpty();
      }
    },

    clear() {
      renderEmpty();
    },
  };
}
