import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { getConnectorIconPathForToolName } from '../../Shared/ConnectorIcons/ConnectorIcons.js';

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

function formatTimestamp(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(date);
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

function createBadge(text, modifier = '') {
  return createElement('span', `replay-badge${modifier ? ` replay-badge--${modifier}` : ''}`, text);
}

function createMetaChip(label, value) {
  if (!value && value !== 0) return null;
  const chip = createElement('div', 'replay-meta-chip');
  chip.append(
    createElement('span', 'replay-meta-chip__label', label),
    createElement('span', 'replay-meta-chip__value', String(value)),
  );
  return chip;
}

function createCodeBlock(label, value) {
  if (!value && value !== 0) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!text.trim()) return null;
  const wrap = createElement('div', 'replay-code-block');
  wrap.append(createElement('div', 'replay-code-block__label', label));
  wrap.append(createElement('pre', 'replay-code-block__pre', text));
  return wrap;
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

// ── Step dot ─────────────────────────────────────────────────────────────────

/**
 * Builds the left-rail dot for a timeline step.
 * Uses a connector <img> when the tool belongs to a known service, otherwise
 * falls back to the generic terminal SVG icon.
 */
function createStepDot(step) {
  const isToolStep = step.type === 'tool';
  const dot = createElement(
    'span',
    `replay-step__dot${isToolStep ? ' replay-step__dot--tool' : ' replay-step__dot--response'}`,
  );

  if (isToolStep) {
    const iconPath = getConnectorIconPathForToolName(step.toolName);
    if (iconPath) {
      const img = document.createElement('img');
      img.src = iconPath;
      img.alt = step.toolName ?? '';
      img.draggable = false;
      img.className = 'replay-step__dot-img';
      dot.append(img);
    } else {
      dot.append(createIcon('terminal', 'replay-step__dot-icon'));
    }
  } else {
    dot.append(createIcon('check', 'replay-step__dot-icon'));
  }

  return dot;
}

// ── Single step node ─────────────────────────────────────────────────────────

function createStepNode(step, strings) {
  const isToolStep = step.type === 'tool';
  const isFinalResponse = step.type === 'response';

  const node = createElement(
    'div',
    `replay-step${isFinalResponse ? ' replay-step--response' : ''}`,
  );

  // ── Left rail ──────────────────────────────────────────────────────────────
  const track = createElement('div', 'replay-step__track');
  track.append(createStepDot(step));
  track.append(createElement('span', 'replay-step__line'));

  // ── Details card ──────────────────────────────────────────────────────────
  const details = document.createElement('details');
  details.className = 'replay-step__details';

  const summary = document.createElement('summary');
  summary.className = 'replay-step__summary';

  const summaryLeft = createElement('span', 'replay-step__summary-left');
  summaryLeft.append(createBadge(String(step.index), isToolStep ? 'tool' : 'response'));
  summaryLeft.append(
    createElement(
      'span',
      'replay-step__label',
      isToolStep ? step.toolName : strings.replay.stepResponse,
    ),
  );

  const summaryRight = createElement('span', 'replay-step__summary-right');
  const ts = formatTimestamp(step.timestamp);
  if (ts) summaryRight.append(createElement('span', 'replay-step__timestamp', ts));
  const dur = formatDuration(step.durationMs);
  if (dur) summaryRight.append(createElement('span', 'replay-step__dur', dur));
  summaryRight.append(createIcon('chevronDown', 'replay-step__chevron'));

  summary.append(summaryLeft, summaryRight);
  details.append(summary);

  // ── Expanded body ──────────────────────────────────────────────────────────
  const body = createElement('div', 'replay-step__body');

  if (isToolStep) {
    const inputBlock = createCodeBlock(strings.replay.stepInput, step.toolInput);
    if (inputBlock) body.append(inputBlock);

    if (step.toolOutput) {
      const outputBlock = createCodeBlock(strings.replay.stepOutput, step.toolOutput);
      if (outputBlock) body.append(outputBlock);
    } else {
      const outputWrap = createElement('div', 'replay-code-block');
      outputWrap.append(
        createElement('div', 'replay-code-block__label', strings.replay.stepOutput),
      );
      outputWrap.append(
        createElement('p', 'replay-code-block__notice', strings.replay.outputNotCaptured),
      );
      body.append(outputWrap);
    }
  }

  if (isFinalResponse && step.toolOutput) {
    const responseBlock = createCodeBlock(strings.replay.stepOutput, step.toolOutput);
    if (responseBlock) body.append(responseBlock);
  }

  details.append(body);
  node.append(track, details);
  return node;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createExecutionReplay(strings) {
  let rootEl = null;
  let headerEl = null;
  let timelineEl = null;
  let replayBtnEl = null;
  let replayBtnSpinnerEl = null;
  let replayBtnLabelEl = null;
  let emptyEl = null;
  let currentRunId = null;
  let isReplaying = false;
  let loadToken = 0; // incremented on each load() call to detect stale responses

  // ── Build skeleton DOM ───────────────────────────────────────────────────

  function build() {
    rootEl = createElement('div', 'replay');
    headerEl = createElement('div', 'replay__header');
    rootEl.append(headerEl);

    timelineEl = createElement('div', 'replay__timeline');
    emptyEl = createElement('div', 'replay__empty', strings.replay.empty);
    emptyEl.hidden = true;

    rootEl.append(timelineEl, emptyEl);
    renderEmpty();
    return rootEl;
  }

  // ── Render states ────────────────────────────────────────────────────────

  function renderEmpty() {
    headerEl.replaceChildren();
    timelineEl.replaceChildren();
    emptyEl.hidden = false;
    emptyEl.textContent = strings.replay.empty;
  }

  function renderLoading() {
    headerEl.replaceChildren();
    emptyEl.hidden = false;
    emptyEl.textContent = strings.replay.loading;
    timelineEl.replaceChildren();
    for (let i = 0; i < 4; i++) {
      timelineEl.append(createElement('div', 'replay-skeleton'));
    }
  }

  function renderRun(run) {
    const steps = Array.isArray(run.steps) ? run.steps : [];

    headerEl.replaceChildren();

    // ── Title + status row ───────────────────────────────────────────────────
    const titleRow = createElement('div', 'replay__title-row');
    titleRow.append(createElement('h3', 'replay__title', run.agentName || strings.replay.untitled));
    titleRow.append(
      createElement(
        'span',
        `replay-status replay-status--${run.status ?? 'success'}`,
        strings.replay.status[run.status] ?? run.status ?? '',
      ),
    );
    headerEl.append(titleRow);

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
    headerEl.append(metaRowEl);

    // ── Reasoning block ──────────────────────────────────────────────────────
    // Shown only when the run captured thinking content.
    if (run.thinking && String(run.thinking).trim()) {
      headerEl.append(createReasoningBlock(String(run.thinking).trim(), strings));
    }

    // ── Prompt summary ───────────────────────────────────────────────────────
    if (run.prompt) {
      const promptWrap = createElement('div', 'replay__prompt-wrap');
      promptWrap.append(
        createElement('span', 'replay__prompt-label', strings.replay.metaPrompt),
        createElement('span', 'replay__prompt-text', run.prompt),
      );
      headerEl.append(promptWrap);
    }

    // ── Replay button ────────────────────────────────────────────────────────
    const btnRow = createElement('div', 'replay__btn-row');
    replayBtnEl = createElement('button', 'replay__btn-replay');
    replayBtnEl.type = 'button';

    replayBtnSpinnerEl = createElement('span', 'replay__btn-spinner');
    replayBtnSpinnerEl.hidden = true;
    replayBtnLabelEl = createElement('span', 'replay__btn-label', strings.replay.replayBtn);

    replayBtnEl.append(
      createIcon('retry', 'replay__btn-icon'),
      replayBtnSpinnerEl,
      replayBtnLabelEl,
    );
    replayBtnEl.addEventListener('click', () => void handleReplay());
    btnRow.append(replayBtnEl);
    headerEl.append(btnRow);

    // ── Timeline ─────────────────────────────────────────────────────────────
    timelineEl.replaceChildren();
    emptyEl.hidden = true;

    if (steps.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = strings.replay.noSteps;
      return;
    }

    for (const step of steps) {
      timelineEl.append(createStepNode(step, strings));
    }

    // Remove the dangling connector line from the last step.
    const lastLine = timelineEl.querySelector('.replay-step:last-child .replay-step__line');
    if (lastLine) lastLine.hidden = true;
  }

  // ── Replay handler ───────────────────────────────────────────────────────

  async function handleReplay() {
    if (!currentRunId || isReplaying) return;
    isReplaying = true;

    if (replayBtnEl) replayBtnEl.disabled = true;
    if (replayBtnSpinnerEl) replayBtnSpinnerEl.hidden = false;
    if (replayBtnLabelEl) replayBtnLabelEl.textContent = strings.replay.replaying;

    let success = false;
    try {
      await invokeIpc('agents:replay-run', currentRunId);
      success = true;
    } catch (err) {
      console.error('[ExecutionReplay] Replay failed:', err);
    }

    if (replayBtnLabelEl) {
      replayBtnLabelEl.textContent = success
        ? strings.replay.replayQueued
        : strings.replay.replayBtn;
    }

    if (success) {
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    if (replayBtnEl) replayBtnEl.disabled = false;
    if (replayBtnSpinnerEl) replayBtnSpinnerEl.hidden = true;
    if (replayBtnLabelEl) replayBtnLabelEl.textContent = strings.replay.replayBtn;
    isReplaying = false;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    build,

    async load(runId) {
      if (!rootEl) return;
      currentRunId = runId;
      isReplaying = false;
      const token = ++loadToken;
      renderLoading();
      try {
        const run = await invokeIpc('agents:load-run-detail', runId);
        if (token !== loadToken) return; // stale — a newer load() was called
        if (!run) {
          renderEmpty();
          return;
        }
        renderRun(run);
      } catch {
        if (token !== loadToken) return;
        renderEmpty();
      }
    },

    clear() {
      currentRunId = null;
      renderEmpty();
    },
  };
}
