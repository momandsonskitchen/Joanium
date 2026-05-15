import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { createIcon, iconMarkup } from '../../Shared/Icons/Icons.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { createAttachmentPill } from './AttachmentPill.js';
import { createTerminalCallElement } from './TerminalPanel.js';
import { createSubAgentPromptSection, upsertSubAgentOutputSection } from './SubAgentSections.js';
import { createThinkingBlock } from './ThinkingBlock.js';
import { formatDuration, stripMarkdown } from './Utils.js';

let activeSpeakBtn = null;

export function resetSpeakButton(btn) {
  if (!btn) return;
  btn.classList.remove('chat-message__action-button--speaking');
  const iconEl = btn.querySelector('.chat-message__action-icon');
  if (iconEl) iconEl.innerHTML = iconMarkup.volumeOn ?? '';
}

function speakText(rawText, btn) {
  if (!window.speechSynthesis) return;

  if (activeSpeakBtn === btn) {
    window.speechSynthesis.cancel();
    resetSpeakButton(btn);
    activeSpeakBtn = null;
    return;
  }

  window.speechSynthesis.cancel();
  resetSpeakButton(activeSpeakBtn);
  activeSpeakBtn = null;

  const text = stripMarkdown(rawText);
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const finish = () => {
    resetSpeakButton(btn);
    activeSpeakBtn = null;
  };

  utterance.onend = finish;
  utterance.onerror = finish;
  activeSpeakBtn = btn;
  btn.classList.add('chat-message__action-button--speaking');
  const iconEl = btn.querySelector('.chat-message__action-icon');
  if (iconEl) iconEl.innerHTML = iconMarkup.volumeStop ?? '';
  window.speechSynthesis.speak(utterance);
}

function createMessageActions({ onCopy, onRetry, onSpeak, durationMs, strings }) {
  const actions = createElement('div', 'chat-message__actions');

  const copyBtn = createElement('button', 'chat-message__action-button');
  copyBtn.type = 'button';
  copyBtn.append(createIcon('copy', 'chat-message__action-icon'));
  copyBtn.addEventListener('click', () => {
    onCopy();
    copyBtn.classList.add('chat-message__action-button--copied');
    const iconEl = copyBtn.querySelector('.chat-message__action-icon');
    if (iconEl) iconEl.innerHTML = iconMarkup.check ?? '';
    setTimeout(() => {
      copyBtn.classList.remove('chat-message__action-button--copied');
      if (iconEl) iconEl.innerHTML = iconMarkup.copy ?? '';
    }, 1500);
  });

  const retryBtn = createElement('button', 'chat-message__action-button');
  retryBtn.type = 'button';
  retryBtn.append(createIcon('retry', 'chat-message__action-icon'));
  retryBtn.addEventListener('click', onRetry);
  actions.append(copyBtn, retryBtn);

  if (typeof onSpeak === 'function') {
    const speakBtn = createElement('button', 'chat-message__action-button');
    speakBtn.type = 'button';
    speakBtn.append(createIcon('volumeOn', 'chat-message__action-icon'));
    speakBtn.addEventListener('click', () => onSpeak(speakBtn));
    actions.append(speakBtn);
  }

  if (durationMs > 0 && strings) {
    const durationEl = createElement(
      'span',
      'chat-message__duration',
      formatText(strings.composer.workedFor, { duration: formatDuration(durationMs) }),
    );
    actions.append(durationEl);
  }

  return actions;
}

export function createMessageElement(message, strings, { onCopy, onRetry } = {}) {
  const article = createElement(
    'article',
    [
      'chat-message',
      `chat-message--${message.role}`,
      message.streaming ? 'chat-message--streaming' : '',
      message.error ? 'chat-message--error' : '',
      message.stopped ? 'chat-message--stopped' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  if (message.role === 'assistant') {
    article.append(createThinkingBlock(strings, message.thinking ?? ''));

    const bubble = createElement('div', 'chat-message__bubble');

    if (message.pending || (message.streaming && !message.content)) {
      const dots = createElement('span', 'chat-message__dots');
      dots.innerHTML = '<span></span><span></span><span></span>';
      bubble.append(dots);
    } else if (message.streaming) {
      // Live stream — render partial markdown + cursor dot
      bubble.append(renderMarkdown((message.content ?? '').trimStart(), 'chat-message__md'));
      bubble.append(createElement('span', 'chat-message__stream-dot'));
    } else {
      // Finalised — render as markdown
      bubble.append(renderMarkdown((message.content ?? '').trimStart(), 'chat-message__md'));
    }

    article.append(bubble);
  } else {
    article.append(createElement('div', 'chat-message__bubble', message.content));
  }

  if (message.attachments?.length) {
    const attachmentList = createElement('div', 'chat-message__attachments');

    for (const attachment of message.attachments) {
      attachmentList.append(createAttachmentPill(attachment, strings));
    }

    article.append(attachmentList);
  }

  if (message.terminal) {
    article.append(createTerminalCallElement(message.terminal, strings));
  }

  if (
    !message.streaming &&
    !message.pending &&
    typeof onCopy === 'function' &&
    typeof onRetry === 'function'
  ) {
    const onSpeak =
      message.role === 'assistant' ? (btn) => speakText(message.content, btn) : undefined;
    article.append(createMessageActions({ onCopy, onRetry, onSpeak }));
  }

  return article;
}

export function updateLastStreamingMessage(threadEl, { content, thinking }) {
  const lastEl = threadEl?.lastElementChild;
  if (!lastEl || !lastEl.classList.contains('chat-message--assistant')) return;

  // Target the LAST thinking/bubble element — works for both single-turn and
  // grouped multi-turn articles where tool loop iterations are merged into one.
  if (thinking) {
    const allThinkingWraps = lastEl.querySelectorAll('.chat-message__thinking');
    const thinkingWrap = allThinkingWraps[allThinkingWraps.length - 1];
    if (thinkingWrap) {
      if (thinkingWrap.dataset.statusMode) {
        // Real thinking has arrived — exit status mode and switch to normal thinking display.
        // The label was saved in data-original-text when status mode was entered.
        delete thinkingWrap.dataset.statusMode;
        const label = thinkingWrap.querySelector('.chat-message__thinking-label');
        if (label?.dataset.originalText) {
          label.textContent = label.dataset.originalText;
          delete label.dataset.originalText;
        }
        const body = thinkingWrap.querySelector('.chat-message__thinking-body');
        if (body) body.replaceChildren(createElement('p', 'chat-message__thinking-text', thinking));
      } else {
        const thinkingText = thinkingWrap.querySelector('.chat-message__thinking-text');
        if (thinkingText) thinkingText.textContent = thinking;
      }
      thinkingWrap.hidden = false;
    }
  }

  if (content) {
    const allBubbles = lastEl.querySelectorAll('.chat-message__bubble');
    const bubble = allBubbles[allBubbles.length - 1];
    if (bubble) {
      bubble.querySelector('.chat-message__dots')?.remove();
      bubble.querySelector('.chat-message__stream-dot')?.remove();
      const fresh = renderMarkdown(content.trimStart(), 'chat-message__md');
      const existing = bubble.querySelector('.chat-message__md, .chat-message__text');
      if (existing) {
        bubble.replaceChild(fresh, existing);
      } else {
        bubble.append(fresh);
      }
      bubble.append(createElement('span', 'chat-message__stream-dot'));
    }
  }
}

/**
 * Updates a sub-agent card in-place without re-rendering the whole thread.
 * Preserves <details> open/closed state across task progress ticks.
 */
export function updateSubAgentCard(threadEl, subAgents, strings) {
  const lastAssistant = threadEl?.lastElementChild;
  if (!lastAssistant) return;
  const card = lastAssistant.querySelector('.chat-subagent-call');
  if (!card) return;

  const doneCount = subAgents.filter(
    (a) => a.status === 'completed' || a.status === 'failed',
  ).length;
  const countEl = card.querySelector('.chat-subagent-call__count');
  if (countEl) {
    countEl.textContent = formatText(strings.tools.subAgentsCountProgress, {
      done: String(doneCount),
      total: String(subAgents.length),
    });
  }

  const agentRows = card.querySelectorAll('.chat-subagent-call__agent');

  subAgents.forEach((agent, i) => {
    const row = agentRows[i];
    if (!row) return;

    const agentStatus = agent.status ?? 'queued';
    row.className = `chat-subagent-call__agent chat-subagent-call__agent--${agentStatus}`;

    const dot = row.querySelector('.chat-subagent-call__agent-status');
    if (dot)
      dot.className = `chat-subagent-call__agent-status chat-subagent-call__agent-status--${agentStatus}`;

    const badge = row.querySelector('.chat-subagent-call__agent-badge');
    if (badge) {
      if (agentStatus === 'running') badge.textContent = strings.tools.subAgentStatusRunning;
      else if (agentStatus === 'completed') badge.textContent = strings.tools.subAgentStatusDone;
      else if (agentStatus === 'failed') badge.textContent = strings.tools.subAgentStatusFailed;
      else badge.textContent = strings.tools.subAgentStatusQueued;
    }

    const body = row.querySelector('.chat-subagent-call__agent-body');
    if (!body) return;

    if (agent.prompt && !body.querySelector('.chat-subagent-call__agent-prompt')) {
      body.prepend(createSubAgentPromptSection(agent, strings));
    }

    upsertSubAgentOutputSection(body, agent, strings);
  });
}

/**
 * Renders a group of consecutive assistant messages (one logical response) as
 * a single <article>. This is what makes interleaved thinking look like Claude.ai:
 *
 *   [REASONING 1]  ← streams in from turn 1
 *   [TEXT 1]       ← "Let me check that…" (omitted if empty)
 *   [TOOL CARD]    ← terminal / toolset call
 *   [REASONING 2]  ← streams in from turn 2
 *   [TEXT 2]       ← final answer
 *   [COPY / RETRY] ← only after the whole response is done
 *
 * Action buttons are withheld until every message in the group is finalised.
 */
export function createAssistantGroupElement(items, strings, { onCopy, onRetry } = {}) {
  const lastMessage = items[items.length - 1].message;
  const isStreaming = items.some(({ message }) => message.streaming || message.pending);

  const article = createElement(
    'article',
    [
      'chat-message',
      'chat-message--assistant',
      isStreaming ? 'chat-message--streaming' : '',
      lastMessage.error ? 'chat-message--error' : '',
      lastMessage.stopped ? 'chat-message--stopped' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  for (const { message } of items) {
    // 1. Thinking block — always first so it appears before the text it precedes
    article.append(createThinkingBlock(strings, message.thinking ?? ''));

    // 2. Text bubble — skipped for intermediate turns that have no visible content
    const bubble = createElement('div', 'chat-message__bubble');

    if (message.pending || (message.streaming && !message.content)) {
      const dots = createElement('span', 'chat-message__dots');
      dots.innerHTML = '<span></span><span></span><span></span>';
      bubble.append(dots);
    } else if (message.streaming) {
      bubble.append(renderMarkdown((message.content ?? '').trimStart(), 'chat-message__md'));
      bubble.append(createElement('span', 'chat-message__stream-dot'));
    } else if (message.content) {
      bubble.append(renderMarkdown((message.content ?? '').trimStart(), 'chat-message__md'));
    }

    if (bubble.childElementCount > 0) {
      article.append(bubble);
    }

    // 3. Tool card — appears after the text that triggered it
    if (message.terminal) {
      article.append(createTerminalCallElement(message.terminal, strings));
    }
  }

  // Action buttons — only after the entire response is complete
  if (!isStreaming && typeof onCopy === 'function' && typeof onRetry === 'function') {
    const onSpeak = (btn) => speakText(lastMessage.content, btn);
    article.append(
      createMessageActions({
        onCopy,
        onRetry,
        onSpeak,
        durationMs: lastMessage.durationMs,
        strings,
      }),
    );
  }

  return article;
}
