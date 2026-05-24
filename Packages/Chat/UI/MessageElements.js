import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { createIcon, iconMarkup } from '../../Shared/Icons/Icons.js';
import { renderMarkdown, renderInline } from '../../Shared/Markdown/MarkdownRenderer.js';
import { createAttachmentPill } from './AttachmentPill.js';
import { createTerminalCallElement } from './TerminalPanel.js';
import { createSubAgentPromptSection, upsertSubAgentOutputSection } from './SubAgentSections.js';
import { createThinkingBlock } from './ThinkingBlock.js';
import { formatDuration, stripMarkdown } from './Utils.js';

let activeSpeakBtn = null;

function getInitials(name) {
  const parts = collapseWhitespace(name ?? '')
    .split(' ')
    .filter(Boolean);
  if (parts.length >= 2) {
    const firstLetter = parts[0][0].toUpperCase();
    const lastWord = parts[parts.length - 1];
    const secondLetter = (lastWord[1] ?? lastWord[0]).toUpperCase();
    return `${firstLetter}${secondLetter}`;
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

function toFileUrl(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

export function createUserAvatar(userProfile) {
  const avatarEl = createElement('div', 'chat-message__avatar chat-message__avatar--user');
  const path = typeof userProfile?.avatarPath === 'string' ? userProfile.avatarPath.trim() : '';
  if (path) {
    const img = document.createElement('img');
    img.src = toFileUrl(path);
    img.alt = '';
    img.draggable = false;
    img.className = 'chat-message__avatar-img';
    avatarEl.append(img);
  } else {
    const initials = getInitials(typeof userProfile?.name === 'string' ? userProfile.name : '');
    avatarEl.textContent = initials;
  }
  return avatarEl;
}

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

function createMessageActions({ onCopy, onRetry, onSpeak, durationMs, modelLabel, strings }) {
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

  if (modelLabel) {
    const modelEl = createElement('span', 'chat-message__model-label', modelLabel);
    actions.append(modelEl);
  }

  return actions;
}

function createContinuationElement(strings, onContinue) {
  const wrap = createElement('div', 'chat-message__continuation');
  wrap.append(
    createElement('p', 'chat-message__continuation-text', strings.composer.responseCutOff),
  );

  if (typeof onContinue === 'function') {
    const btn = createElement('button', 'chat-message__continue-button');
    btn.type = 'button';
    btn.append(
      createIcon('play', 'chat-message__continue-icon'),
      createElement('span', 'chat-message__continue-label', strings.composer.continueResponse),
    );
    btn.addEventListener('click', onContinue);
    wrap.append(btn);
  }

  return wrap;
}

export function createMessageElement(
  message,
  strings,
  { onCopy, onRetry, onContinue, userProfile } = {},
) {
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

    if (message.needsContinuation) {
      bubble.append(createContinuationElement(strings, onContinue));
    } else if (message.pending || (message.streaming && !message.content)) {
      const dots = createElement('span', 'chat-message__dots');
      dots.innerHTML = '<span></span><span></span><span></span>';
      bubble.append(dots);
    } else if (message.streaming) {
      bubble.append(renderMarkdown((message.content ?? '').trimStart(), 'chat-message__md'));
      bubble.append(createElement('span', 'chat-message__stream-dot'));
    } else {
      bubble.append(renderMarkdown((message.content ?? '').trimStart(), 'chat-message__md'));
    }

    article.append(bubble);
  } else {
    // User message: [content column] + [avatar] in a row
    const row = createElement('div', 'chat-message__row');
    const contentEl = createElement('div', 'chat-message__content');

    contentEl.append(createElement('div', 'chat-message__bubble', message.content));

    if (message.attachments?.length) {
      const attachmentList = createElement('div', 'chat-message__attachments');
      for (const attachment of message.attachments) {
        attachmentList.append(createAttachmentPill(attachment, strings));
      }
      contentEl.append(attachmentList);
    }

    row.append(contentEl, createUserAvatar(userProfile));
    article.append(row);
  }

  if (message.terminal) {
    article.append(createTerminalCallElement(message.terminal, strings));
  }

  if (
    !message.streaming &&
    !message.pending &&
    !message.needsContinuation &&
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
      // Skip update if thinking text hasn't changed since last render.
      if (thinkingWrap.__lastThinking === thinking) {
        // no-op — content unchanged
      } else {
        thinkingWrap.__lastThinking = thinking;
        if (thinkingWrap.__statusMode) {
          // Real thinking has arrived — exit status mode and switch to normal thinking display.
          delete thinkingWrap.__statusMode;
          const label = thinkingWrap.querySelector('.chat-message__thinking-label');
          if (label?.__originalText) {
            label.textContent = label.__originalText;
            delete label.__originalText;
          }
          const body = thinkingWrap.querySelector('.chat-message__thinking-body');
          if (body)
            body.replaceChildren(createElement('p', 'chat-message__thinking-text', thinking));
        } else {
          const thinkingText = thinkingWrap.querySelector('.chat-message__thinking-text');
          if (thinkingText) thinkingText.textContent = thinking;
        }
        thinkingWrap.hidden = false;
      }
    }
  }

  if (content) {
    const allBubbles = lastEl.querySelectorAll('.chat-message__bubble');
    const bubble = allBubbles[allBubbles.length - 1];
    if (bubble) {
      if (bubble.__lastContent === content) return;
      bubble.__lastContent = content;

      // Remove loading dots on first content.
      bubble.querySelector('.chat-message__dots')?.remove();

      const trimmed = content.trimStart();

      // ── Settled / Tail split ────────────────────────────────────────────
      // Split at the last safe paragraph boundary (double newline that is
      // NOT inside an unclosed code fence).  Everything before the boundary
      // is "settled" — rendered as full markdown and cached.  Everything
      // after is the "active tail" — the paragraph currently being typed,
      // updated word-by-word via cheap inline formatting (renderInline).
      // This mirrors how Claude.ai streams: text appears smoothly and
      // formatting "clicks into place" as blocks complete.
      const boundary = findSettledBoundary(trimmed);
      const settled = boundary > 0 ? trimmed.slice(0, boundary) : '';
      const tail = boundary > 0 ? trimmed.slice(boundary + 2) : trimmed;

      // Re-render settled markdown only when it actually changes.
      if (settled !== (bubble.__settledContent || '')) {
        bubble.__settledContent = settled;
        const freshMd = settled ? renderMarkdown(settled, 'chat-message__md') : null;
        const existingMd = bubble.querySelector('.chat-message__md');
        if (freshMd && existingMd) {
          bubble.replaceChild(freshMd, existingMd);
        } else if (freshMd) {
          // Insert before the tail element (if present) or at the start.
          const tailEl = bubble.querySelector('.chat-message__stream-tail');
          if (tailEl) bubble.insertBefore(freshMd, tailEl);
          else bubble.prepend(freshMd);
        } else if (existingMd) {
          existingMd.remove();
        }
      }

      // Update the active tail — just inline formatting on a short string,
      // nearly free compared to a full markdown parse + DOM rebuild.
      let tailEl = bubble.querySelector('.chat-message__stream-tail');
      if (tail) {
        if (!tailEl) {
          tailEl = document.createElement('p');
          tailEl.className = 'md-p chat-message__stream-tail';
          // Remove any bubble-level orphan dot before creating tailEl so it
          // doesn't float as a block sibling and drop to its own line.
          bubble.querySelector('.chat-message__stream-dot')?.remove();
          bubble.append(tailEl);
        }
        // Grab the existing dot BEFORE innerHTML wipes it — reusing the same
        // element preserves the CSS animation state (no restart flicker).
        const existingDot = bubble.querySelector('.chat-message__stream-dot');
        tailEl.innerHTML = renderInline(tail);
        // Dot lives INSIDE the tail paragraph so it flows inline with the text.
        tailEl.append(existingDot ?? createElement('span', 'chat-message__stream-dot'));
      } else if (tailEl) {
        // Move the dot out to bubble level before removing tailEl.
        const dotEl = tailEl.querySelector('.chat-message__stream-dot');
        tailEl.remove();
        if (dotEl) bubble.append(dotEl);
      }

      // No tail (all content settled) — ensure dot is still present.
      if (!bubble.querySelector('.chat-message__stream-dot')) {
        bubble.append(createElement('span', 'chat-message__stream-dot'));
      }
    }
  }
}

/**
 * Finds the position of the last safe paragraph boundary (double newline)
 * that is NOT inside an unclosed code fence.  Returns -1 if no safe
 * boundary exists.
 */
function findSettledBoundary(text) {
  // Count code fences — if odd, the last fence is unclosed.
  const fences = text.match(/```/g);
  if (fences && fences.length % 2 !== 0) {
    // Find the opening of the unclosed fence and look for a boundary before it.
    const lastFence = text.lastIndexOf('```');
    const before = text.lastIndexOf('\n\n', lastFence);
    return before > 0 ? before : -1;
  }
  return text.lastIndexOf('\n\n');
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
export function createAssistantGroupElement(
  items,
  strings,
  { onCopy, onRetry, onContinue, isGenerating = false, getProviderIcon } = {},
) {
  const lastMessage = items[items.length - 1].message;
  const firstMessage = items[0].message;
  const isStreaming = items.some(({ message }) => message.streaming || message.pending);
  const needsContinuation = items.some(({ message }) => message.needsContinuation);

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

  // Row: [provider avatar] + [content column]
  const row = createElement('div', 'chat-message__row');

  // Provider avatar
  const iconPath = typeof getProviderIcon === 'function' ? getProviderIcon(firstMessage) : '';
  const avatarEl = createElement('div', 'chat-message__avatar chat-message__avatar--provider');
  if (iconPath) {
    const img = document.createElement('img');
    img.src = iconPath;
    img.alt = firstMessage.providerLabel ?? 'AI';
    img.draggable = false;
    avatarEl.append(img);
  } else {
    avatarEl.textContent = '✦';
  }

  const contentEl = createElement('div', 'chat-message__content');

  for (const { message } of items) {
    // 1. Thinking block — always first so it appears before the text it precedes
    contentEl.append(createThinkingBlock(strings, message.thinking ?? ''));

    // 2. Text bubble — skipped for intermediate turns that have no visible content,
    //    and skipped entirely for tool messages (terminal card renders below instead).
    if (!message.terminal) {
      const bubble = createElement('div', 'chat-message__bubble');

      if (message.needsContinuation) {
        bubble.append(createContinuationElement(strings, onContinue));
      } else if (message.pending || (message.streaming && !message.content)) {
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
        contentEl.append(bubble);
      }
    }

    // 3. Tool card — appears after the text that triggered it
    if (message.terminal) {
      contentEl.append(createTerminalCallElement(message.terminal, strings));
    }
  }

  row.append(avatarEl, contentEl);
  article.append(row);

  // Action buttons — only after the entire response is complete and no generation is in flight
  if (
    !isStreaming &&
    !needsContinuation &&
    !isGenerating &&
    typeof onCopy === 'function' &&
    typeof onRetry === 'function'
  ) {
    const onSpeak = (btn) => speakText(lastMessage.content, btn);
    article.append(
      createMessageActions({
        onCopy,
        onRetry,
        onSpeak,
        durationMs: lastMessage.durationMs,
        modelLabel: lastMessage.modelLabel,
        strings,
      }),
    );
  }

  return article;
}
