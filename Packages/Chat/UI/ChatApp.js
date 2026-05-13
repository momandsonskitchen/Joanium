import {
  getTimeGreetings,
  isBirthdayToday,
  getBirthdayGreeting,
  isChristmasToday,
  getChristmasGreeting,
  isNewYearToday,
  getNewYearGreeting,
  getPrivateGreeting,
} from '../../../Datasets/Messages.js';
import { getRandomSuggestions } from '../../../Datasets/Suggestions.js';
import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace, truncate } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createIcon, iconMarkup } from '../../Shared/Icons/Icons.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { parseThinkingFromText } from '../../Shared/Markdown/ThinkingParser.js';
import { normalizeSubAgentTasks } from '../../Shared/SubAgents/SubAgentTasks.js';
import {
  initCompletionSound,
  markCompletionSoundAborted,
  playCompletionSound,
} from './CompletionSound.js';

function getFirstName(name, fallback) {
  const normalized = collapseWhitespace(name);
  if (!normalized) return fallback;
  return normalized.split(' ')[0];
}

function stripMarkdown(text) {
  return String(text ?? '')
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^~~~[\s\S]*?^~~~/gm, '')
    .replace(/`[^`\n]+`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*{3}|_{3})(.*?)\1/g, '$2')
    .replace(/(\*{2}|_{2})(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+[.)]\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strips any XML-style native tool call markup that models may emit alongside
 * the joanium-tool code block. Different models have different tag names
 * (e.g. <tool_call>, <function_call>, <invoke>, vendor-namespaced variants like
 * <vendor:toolcall>, etc.) so we match the shape rather than specific names.
 */
function stripNativeToolCalls(text) {
  if (!text) return text;
  return (
    text
      // Namespaced XML tags: <vendor:anything>...</vendor:anything>
      .replace(/<[a-z][a-z0-9]*:[a-z][a-z0-9_-]*[\s\S]*?<\/[a-z][a-z0-9]*:[a-z][a-z0-9_-]*>/gi, '')
      // Common unnamespaced tool-call wrapper elements (complete pairs only)
      .replace(
        /<(?:tool_call|tool_use|function_call|invoke|tool_calls)[^>]*>[\s\S]*?<\/(?:tool_call|tool_use|function_call|invoke|tool_calls)>/gi,
        '',
      )
      // Orphaned opening tags of the same set (mid-stream cutoff)
      .replace(/<(?:tool_call|tool_use|function_call|invoke|tool_calls)[^>]*>/gi, '')
      // Orphaned closing tags
      .replace(/<\/(?:tool_call|tool_use|function_call|invoke|tool_calls)>/gi, '')
      .trim()
  );
}

/**
 * Strips joanium-tool and joanium-terminal fenced blocks from visible content.
 * Used when generation is stopped mid-stream so raw JSON doesn't render as markdown.
 */
function stripToolCallBlocks(text) {
  if (!text) return text;
  return text
    .replace(/```joanium-tool[\s\S]*?```/gi, '')
    .replace(/```joanium-terminal[\s\S]*?```/gi, '')
    .trim();
}

let activeSpeakBtn = null;

function resetSpeakButton(btn) {
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

function createMessageElement(message, strings, { onCopy, onRetry } = {}) {
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
    const thinkingWrap = document.createElement('details');
    thinkingWrap.className = 'chat-message__thinking';
    thinkingWrap.hidden = !message.thinking;

    const thinkingSummary = createElement('summary', 'chat-message__thinking-summary');
    thinkingSummary.append(
      createIcon('thinking', 'chat-message__thinking-icon'),
      createElement('span', 'chat-message__thinking-label', strings.composer.reasoning),
    );
    thinkingWrap.append(thinkingSummary);

    const thinkingBody = createElement('div', 'chat-message__thinking-body');
    thinkingBody.append(createElement('p', 'chat-message__thinking-text', message.thinking ?? ''));
    thinkingWrap.append(thinkingBody);
    article.append(thinkingWrap);

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

function updateLastStreamingMessage(threadEl, { content, thinking }) {
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
function updateSubAgentCard(threadEl, subAgents, strings) {
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
      const promptSection = createElement('div', 'chat-subagent-call__agent-section');
      const promptTitle = createElement(
        'h4',
        'chat-subagent-call__agent-section-title',
        strings.tools.subAgentPromptSection,
      );
      const promptEl = renderMarkdown(agent.prompt, 'chat-subagent-call__agent-prompt');
      promptSection.append(promptTitle, promptEl);
      body.prepend(promptSection);
    }

    if (agent.output || agent.error) {
      let outputSection = body.querySelector('.chat-subagent-call__agent-output-section');
      const rawOutput = agent.output || agent.error || '';
      const { content: parsedOutput, thinking: outputThinking } = parseThinkingFromText(rawOutput);

      if (!outputSection) {
        outputSection = createElement(
          'div',
          'chat-subagent-call__agent-section chat-subagent-call__agent-output-section',
        );
        const isError = Boolean(agent.error && !agent.output);
        const sectionTitle = createElement(
          'h4',
          'chat-subagent-call__agent-section-title',
          isError ? strings.tools.subAgentErrorSection : strings.tools.subAgentOutputSection,
        );
        outputSection.append(sectionTitle);
        if (outputThinking) {
          const thinkWrap = document.createElement('details');
          thinkWrap.className = 'chat-message__thinking';
          const thinkSummary = createElement('summary', 'chat-message__thinking-summary');
          thinkSummary.append(
            createIcon('thinking', 'chat-message__thinking-icon'),
            createElement('span', 'chat-message__thinking-label', strings.composer.reasoning),
          );
          thinkWrap.append(thinkSummary);
          const thinkBody = createElement('div', 'chat-message__thinking-body');
          thinkBody.append(createElement('p', 'chat-message__thinking-text', outputThinking));
          thinkWrap.append(thinkBody);
          outputSection.append(thinkWrap);
        }
        outputSection.append(
          renderMarkdown(
            (parsedOutput || rawOutput).trimStart(),
            'chat-subagent-call__agent-output',
          ),
        );
        body.append(outputSection);
      } else {
        // Update thinking block if it exists, or create if thinking newly arrived
        let thinkWrap = outputSection.querySelector('.chat-message__thinking');
        if (outputThinking) {
          if (!thinkWrap) {
            thinkWrap = document.createElement('details');
            thinkWrap.className = 'chat-message__thinking';
            const thinkSummary = createElement('summary', 'chat-message__thinking-summary');
            thinkSummary.append(
              createIcon('thinking', 'chat-message__thinking-icon'),
              createElement('span', 'chat-message__thinking-label', strings.composer.reasoning),
            );
            thinkWrap.append(thinkSummary);
            const thinkBody = createElement('div', 'chat-message__thinking-body');
            thinkBody.append(createElement('p', 'chat-message__thinking-text', outputThinking));
            thinkWrap.append(thinkBody);
            const sectionTitle = outputSection.querySelector(
              '.chat-subagent-call__agent-section-title',
            );
            if (sectionTitle) sectionTitle.after(thinkWrap);
            else outputSection.prepend(thinkWrap);
          } else {
            const thinkText = thinkWrap.querySelector('.chat-message__thinking-text');
            if (thinkText) thinkText.textContent = outputThinking;
          }
        }
        // Re-render output markdown with fresh content
        const existing = outputSection.querySelector('.chat-subagent-call__agent-output');
        const fresh = renderMarkdown(
          (parsedOutput || rawOutput).trimStart(),
          'chat-subagent-call__agent-output',
        );
        if (existing) existing.replaceWith(fresh);
        else outputSection.append(fresh);
      }
    }
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
function createAssistantGroupElement(items, strings, { onCopy, onRetry } = {}) {
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
    const thinkingWrap = document.createElement('details');
    thinkingWrap.className = 'chat-message__thinking';
    thinkingWrap.hidden = !message.thinking;

    const thinkingSummary = createElement('summary', 'chat-message__thinking-summary');
    thinkingSummary.append(
      createIcon('thinking', 'chat-message__thinking-icon'),
      createElement('span', 'chat-message__thinking-label', strings.composer.reasoning),
    );
    thinkingWrap.append(thinkingSummary);
    const thinkingBody = createElement('div', 'chat-message__thinking-body');
    thinkingBody.append(createElement('p', 'chat-message__thinking-text', message.thinking ?? ''));
    thinkingWrap.append(thinkingBody);
    article.append(thinkingWrap);

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

function getPreferredProvider(payload) {
  const selectedIds = payload.user?.providers?.selected ?? [];
  const byId = new Map(payload.providers.map((provider) => [provider.id, provider]));
  const ordered = [
    ...selectedIds.map((id) => byId.get(id)).filter(Boolean),
    ...payload.providers.filter((provider) => !selectedIds.includes(provider.id)),
  ];

  return (
    ordered.find((provider) => {
      const details = payload.user?.providers?.details?.[provider.id] ?? {};
      return (
        Boolean(provider.models?.[0]?.id) &&
        Boolean(collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint)) &&
        (provider.requiresApiKey ? Boolean(collapseWhitespace(details.apiKey)) : true)
      );
    }) ??
    ordered.find((provider) => provider.models?.length > 0) ??
    payload.providers[0] ??
    null
  );
}

function createModelPickerPanel({ providers, userProviderDetails, strings, onSelect }) {
  const panel = createElement('div', 'chat-model-picker');
  document.body.append(panel);

  const scroller = createElement('div', 'chat-model-picker__scroller');
  panel.append(scroller);

  // key: "providerId/modelId"  value: dot element
  const dotRefs = new Map();

  const readyProviders = providers.filter((provider) => {
    if (!provider.models?.length) return false;
    const details = userProviderDetails?.[provider.id] ?? {};
    const endpoint = collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint);
    if (!endpoint) return false;
    if (provider.requiresApiKey && !collapseWhitespace(details.apiKey)) return false;
    return true;
  });

  for (const provider of readyProviders) {
    const group = createElement('div', 'chat-model-picker__group');
    group.append(createElement('div', 'chat-model-picker__group-header', provider.label));

    for (const model of provider.models) {
      const option = createElement('button', 'chat-model-picker__option');
      option.type = 'button';
      option._pickerProviderId = provider.id;
      option._pickerModelId = model.id;

      const dot = createElement(
        'span',
        'chat-model-picker__health-dot chat-model-picker__health-dot--unknown',
      );
      dot.setAttribute('aria-label', strings.composer.healthYellow);
      const label = createElement(
        'span',
        'chat-model-picker__option-label',
        model.name ?? model.id,
      );
      option.append(dot, label);
      dotRefs.set(`${provider.id}/${model.id}`, dot);

      option.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(provider, model);
      });
      group.append(option);
    }

    scroller.append(group);
  }

  function healthLabel(status) {
    if (status === 'green') return strings.composer.healthGreen;
    if (status === 'red') return strings.composer.healthRed;
    return strings.composer.healthYellow;
  }

  function setDotStatus(dot, status) {
    dot.className = `chat-model-picker__health-dot chat-model-picker__health-dot--${status}`;
    dot.setAttribute('aria-label', healthLabel(status));
  }

  function applyHealthMap(map) {
    for (const [key, status] of Object.entries(map)) {
      const dot = dotRefs.get(key);
      if (!dot) continue;
      setDotStatus(dot, status);
    }
  }

  // Fetch cached health immediately, then kick off background probes for
  // any model whose status is still unknown / stale.
  invokeIpc('chat:health-get')
    .then((healthMap) => {
      applyHealthMap(healthMap);

      // Fire a background probe for every yellow model.
      for (const provider of readyProviders) {
        for (const model of provider.models) {
          const key = `${provider.id}/${model.id}`;
          if ((healthMap[key] ?? 'yellow') === 'yellow') {
            void invokeIpc('chat:health-probe', provider.id, model.id);
          }
        }
      }
    })
    .catch(() => {});

  // Live updates arriving while the picker is open.
  const disposeHealthListener = onIpc('chat:health-update', ({ key, status }) => {
    const dot = dotRefs.get(key);
    if (dot) setDotStatus(dot, status);
  });

  const scrollbar = attachCustomScrollbar(panel, scroller);

  return {
    element: panel,
    dispose() {
      disposeHealthListener();
      scrollbar.dispose();
    },
  };
}

function generateSessionId() {
  const date = new Date();
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;
}

function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function getFileExtension(fileName = '') {
  const ext = String(fileName).split('.').pop()?.trim().toUpperCase();
  return ext && ext !== fileName.toUpperCase() ? ext.slice(0, 4) : 'FILE';
}

function toAttachmentSummary(attachment) {
  return {
    id: attachment.id,
    name: attachment.name ?? '',
    summary: attachment.summary ?? '',
    kind: attachment.kind ?? '',
    size: attachment.size ?? 0,
    lines: attachment.lines ?? 0,
    truncated: Boolean(attachment.truncated),
  };
}

function buildAttachmentContext(strings, attachments) {
  // Images are sent as multimodal content blocks — exclude them from text context.
  const textAttachments = attachments.filter((a) => a.kind !== 'image' && a.text);
  if (!textAttachments.length) return '';

  const blocks = textAttachments.map((attachment, index) => {
    const header = formatText(strings.composer.attachmentContextItem, {
      index: String(index + 1),
      name: attachment.name ?? strings.composer.unknownAttachment,
    });
    const summary = attachment.summary
      ? formatText(strings.composer.attachmentContextSummary, { summary: attachment.summary })
      : '';
    const truncated = attachment.truncated ? strings.composer.attachmentContextTruncated : '';

    return [header, summary, truncated, attachment.text ?? ''].filter(Boolean).join('\n');
  });

  return `${strings.composer.attachmentContextHeader}\n\n${blocks.join('\n\n')}`;
}

function buildModelContent(strings, prompt, attachments) {
  const attachmentContext = buildAttachmentContext(strings, attachments);
  return [prompt, attachmentContext].filter(Boolean).join('\n\n');
}

function createAttachmentPill(attachment, strings, { removable = false, onRemove } = {}) {
  const pill = createElement('div', 'chat-attachment');

  // For image attachments that still have their base64 data in memory,
  // show a small thumbnail instead of the plain extension badge.
  let badge;
  if (attachment.kind === 'image' && attachment.base64 && attachment.mimeType) {
    badge = createElement('span', 'chat-attachment__badge chat-attachment__badge--thumb');
    const thumb = document.createElement('img');
    thumb.src = `data:${attachment.mimeType};base64,${attachment.base64}`;
    thumb.className = 'chat-attachment__thumb';
    thumb.alt = '';
    thumb.draggable = false;
    badge.append(thumb);
  } else {
    badge = createElement('span', 'chat-attachment__badge', getFileExtension(attachment.name));
  }
  const body = createElement('span', 'chat-attachment__body');
  const name = createElement(
    'span',
    'chat-attachment__name',
    attachment.name || strings.composer.unknownAttachment,
  );
  const metaParts = [attachment.summary, formatBytes(attachment.size)].filter(Boolean);
  const meta = createElement('span', 'chat-attachment__meta', metaParts.join(' - '));

  body.append(name, meta);
  pill.append(badge, body);

  if (removable) {
    const removeButton = createElement('button', 'chat-attachment__remove');
    removeButton.type = 'button';
    removeButton.setAttribute(
      'aria-label',
      formatText(strings.composer.removeAttachmentNamed, {
        name: attachment.name || strings.composer.unknownAttachment,
      }),
    );
    removeButton.append(createIcon('close', 'chat-attachment__remove-icon'));
    removeButton.addEventListener('click', () => onRemove?.(attachment.id));
    pill.append(removeButton);
  }

  return pill;
}

const DEFAULT_BROWSER_PREVIEW_STATE = Object.freeze({
  visible: false,
  hasView: false,
  hasPage: false,
  title: '',
  url: '',
  status: '',
  loading: false,
  canGoBack: false,
  canGoForward: false,
});

function normalizeBrowserPreviewState(state = {}) {
  return { ...DEFAULT_BROWSER_PREVIEW_STATE, ...state };
}

function browserPreviewTone(state) {
  const status = String(state.status ?? '').toLowerCase();
  if (state.loading) return 'loading';
  if (/failed|error|unexpected|timeout/.test(status)) return 'error';
  if (state.visible && state.hasPage) return 'live';
  if (state.hasPage) return 'paused';
  return 'idle';
}

function createBrowserPreviewPanel(strings, { onVisibilityChange } = {}) {
  let currentState = normalizeBrowserPreviewState();
  let disposeStateListener = null;
  let animationFrameId = 0;
  let lastBoundsKey = '';

  const panel = createElement('aside', 'browser-preview');
  panel.hidden = true;

  const header = createElement('div', 'browser-preview__header');
  const identity = createElement('div', 'browser-preview__identity');
  const eyebrow = createElement('div', 'browser-preview__eyebrow');
  eyebrow.append(
    createIcon('globe', 'browser-preview__eyebrow-icon'),
    createElement('span', '', strings.eyebrow),
  );
  const title = createElement('h2', 'browser-preview__title', strings.title);
  const urlLabel = createElement('div', 'browser-preview__url', strings.emptyUrl);
  identity.append(eyebrow, title, urlLabel);

  const controls = createElement('div', 'browser-preview__controls');
  const backButton = createElement('button', 'browser-preview__control');
  const forwardButton = createElement('button', 'browser-preview__control');
  const reloadButton = createElement('button', 'browser-preview__control');
  const closeButton = createElement('button', 'browser-preview__control');
  backButton.type = 'button';
  forwardButton.type = 'button';
  reloadButton.type = 'button';
  closeButton.type = 'button';
  backButton.setAttribute('aria-label', strings.back);
  forwardButton.setAttribute('aria-label', strings.forward);
  reloadButton.setAttribute('aria-label', strings.reload);
  closeButton.setAttribute('aria-label', strings.close);
  backButton.append(createIcon('arrowLeft', 'browser-preview__control-icon'));
  forwardButton.append(createIcon('arrowRight', 'browser-preview__control-icon'));
  reloadButton.append(createIcon('retry', 'browser-preview__control-icon'));
  closeButton.append(createIcon('close', 'browser-preview__control-icon'));
  controls.append(backButton, forwardButton, reloadButton, closeButton);
  header.append(identity, controls);

  const statusRow = createElement('div', 'browser-preview__status-row');
  const statusDot = createElement(
    'span',
    'browser-preview__status-dot browser-preview__status-dot--idle',
  );
  const statusText = createElement('span', 'browser-preview__status', strings.ready);
  statusRow.append(statusDot, statusText);

  const mount = createElement('div', 'browser-preview__mount');
  mount.id = 'browser-preview-mount';
  const viewport = createElement('div', 'browser-preview__viewport');
  const empty = createElement('div', 'browser-preview__empty');
  empty.append(
    createIcon('globe', 'browser-preview__empty-icon'),
    createElement('strong', 'browser-preview__empty-title', strings.emptyTitle),
    createElement('span', 'browser-preview__empty-copy', strings.emptyCopy),
  );
  mount.append(viewport, empty);
  panel.append(header, statusRow, mount);

  function setTone(tone) {
    statusDot.className = `browser-preview__status-dot browser-preview__status-dot--${tone}`;
    statusText.className = `browser-preview__status browser-preview__status--${tone}`;
  }

  async function syncBounds() {
    const shouldAttach = currentState.visible && !panel.hidden;
    let bounds = null;

    if (shouldAttach) {
      const rect = viewport.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        bounds = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }
    }

    const boundsKey = bounds ? `${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}` : 'null';
    if (boundsKey === lastBoundsKey) return;
    lastBoundsKey = boundsKey;
    await invokeIpc('browser-preview:set-bounds', bounds).catch(() => {
      lastBoundsKey = '';
    });
  }

  function scheduleBoundsSync() {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(() => {
      void syncBounds();
    });
  }

  function applyState(nextState) {
    currentState = normalizeBrowserPreviewState(nextState);
    const visible = Boolean(currentState.visible);
    panel.hidden = !visible;
    panel.classList.toggle('browser-preview--visible', visible);
    panel.classList.toggle('browser-preview--has-page', Boolean(currentState.hasPage));
    panel.classList.toggle('browser-preview--loading', Boolean(currentState.loading));
    onVisibilityChange?.(visible);

    title.textContent = currentState.title || strings.title;
    urlLabel.textContent = currentState.url || strings.emptyUrl;
    statusText.textContent =
      currentState.status || (currentState.loading ? strings.loading : strings.ready);
    setTone(browserPreviewTone(currentState));

    backButton.disabled = !currentState.canGoBack;
    forwardButton.disabled = !currentState.canGoForward;
    reloadButton.disabled = !currentState.hasPage;

    scheduleBoundsSync();
  }

  backButton.addEventListener('click', () => {
    void invokeIpc('browser-preview:go-back');
  });
  forwardButton.addEventListener('click', () => {
    void invokeIpc('browser-preview:go-forward');
  });
  reloadButton.addEventListener('click', () => {
    void invokeIpc('browser-preview:reload');
  });
  closeButton.addEventListener('click', () => {
    void invokeIpc('browser-preview:close')
      .then(applyState)
      .catch(() => {});
  });
  return {
    element: panel,
    start() {
      disposeStateListener = onIpc('browser-preview:state', applyState);
      window.addEventListener('resize', scheduleBoundsSync);
      invokeIpc('browser-preview:get-state')
        .then(applyState)
        .catch(() => applyState(DEFAULT_BROWSER_PREVIEW_STATE));
    },
    stop() {
      disposeStateListener?.();
      disposeStateListener = null;
      window.removeEventListener('resize', scheduleBoundsSync);
      cancelAnimationFrame(animationFrameId);
      void invokeIpc('browser-preview:set-bounds', null);
    },
    // Detach the native view without closing it — called when the user leaves chat.
    pause() {
      void invokeIpc('browser-preview:pause');
    },
    // Re-attach the native view — called when the user returns to chat.
    resume() {
      void invokeIpc('browser-preview:resume');
    },
  };
}

const MAX_TERMINAL_TOOL_CALLS = 3;
const TERMINAL_TOOL_BLOCK_RE = /```joanium-terminal\s*([\s\S]*?)```/i;
const TOOLSET_TOOL_BLOCK_RE = /```joanium-tool\s*([\s\S]*?)```/i;
const SUPPORTED_TERMINAL_TOOLS = new Set([
  'run_shell_command',
  'assess_shell_command',
  'inspect_workspace',
  'search_workspace',
  'read_local_file',
  'list_directory',
  'git_status',
  'git_diff',
  'git_branches',
  'git_create_branch',
  'git_checkout_branch',
  'git_delete_branch',
  'git_pull',
  'git_commit',
  'git_push',
  'git_push_sync',
  'run_project_checks',
  'start_local_server',
  'read_terminal_output',
]);

function parseJsonToolBlock(text, blockRegex) {
  const rawText = String(text ?? '');
  const match = rawText.match(blockRegex);

  if (!match) {
    return null;
  }

  try {
    return {
      payload: JSON.parse(match[1].trim()),
      visibleContent: rawText.replace(match[0], '').trim(),
    };
  } catch {
    return null;
  }
}

function parseTerminalToolRequest(text) {
  const parsed = parseJsonToolBlock(text, TERMINAL_TOOL_BLOCK_RE);

  if (!parsed) {
    return null;
  }

  const tool = String(parsed.payload?.tool ?? '').trim();

  if (!SUPPORTED_TERMINAL_TOOLS.has(tool)) {
    return {
      tool,
      payload: parsed.payload,
      unsupported: true,
      visibleContent: parsed.visibleContent,
    };
  }

  return {
    tool,
    payload: parsed.payload,
    unsupported: false,
    visibleContent: parsed.visibleContent,
  };
}

function parseToolsetToolRequest(text) {
  const parsed = parseJsonToolBlock(text, TOOLSET_TOOL_BLOCK_RE);
  if (!parsed) return null;

  return {
    tool: String(parsed.payload?.tool ?? '').trim(),
    payload: parsed.payload,
    visibleContent: parsed.visibleContent,
  };
}

function getTerminalToolLabel(strings, tool) {
  return strings.terminal?.toolLabels?.[tool] ?? tool;
}

function getTerminalActionSummary(action, strings) {
  const payload = action?.payload ?? {};

  if (payload.command) {
    return payload.command;
  }

  if (payload.query) {
    return payload.query;
  }

  if (payload.path) {
    return payload.path;
  }

  if (payload.working_directory) {
    return payload.working_directory;
  }

  return getTerminalToolLabel(strings, action?.tool);
}

function createSubAgentCallElement(terminal, strings) {
  const status = terminal.status ?? 'running';
  const subAgents = terminal.subAgents ?? [];
  const doneCount = subAgents.filter(
    (a) => a.status === 'completed' || a.status === 'failed',
  ).length;

  const card = createElement(
    'section',
    `chat-terminal-call chat-terminal-call--${status} chat-subagent-call`,
  );

  const header = createElement('div', 'chat-terminal-call__header');
  const identity = createElement('div', 'chat-terminal-call__identity');
  const icon = createIcon('tabAgents', 'chat-terminal-call__icon');
  const copy = createElement('div', 'chat-terminal-call__copy');
  const label = createElement(
    'div',
    'chat-terminal-call__label',
    terminal.label || strings.tools.subAgentsLabel,
  );
  const count = createElement('div', 'chat-subagent-call__count');
  count.textContent =
    subAgents.length > 0
      ? formatText(strings.tools.subAgentsCountProgress, {
          done: String(doneCount),
          total: String(subAgents.length),
        })
      : (terminal.statusLabel ?? strings.tools.subAgentsRunning);
  copy.append(label, count);
  identity.append(icon, copy);
  const statusEl = createElement(
    'span',
    'chat-terminal-call__status',
    terminal.statusLabel ?? status,
  );
  header.append(identity, statusEl);
  card.append(header);

  if (subAgents.length > 0) {
    const agentsContainer = createElement('div', 'chat-subagent-call__agents');

    for (const [index, agent] of subAgents.entries()) {
      const agentStatus = agent.status ?? 'queued';
      const details = document.createElement('details');
      details.className = `chat-subagent-call__agent chat-subagent-call__agent--${agentStatus}`;

      const summary = createElement('summary', 'chat-subagent-call__agent-summary');
      const statusDot = createElement(
        'span',
        `chat-subagent-call__agent-status chat-subagent-call__agent-status--${agentStatus}`,
      );

      const info = createElement('div', 'chat-subagent-call__agent-info');
      const title = createElement('div', 'chat-subagent-call__agent-title', agent.title || '');
      const goal = createElement('div', 'chat-subagent-call__agent-goal', agent.goal || '');
      info.append(title, goal);

      const badge = createElement('span', 'chat-subagent-call__agent-badge');
      if (agentStatus === 'running') badge.textContent = strings.tools.subAgentStatusRunning;
      else if (agentStatus === 'completed') badge.textContent = strings.tools.subAgentStatusDone;
      else if (agentStatus === 'failed') badge.textContent = strings.tools.subAgentStatusFailed;
      else badge.textContent = strings.tools.subAgentStatusQueued;

      const chevron = createIcon('chevronDown', 'chat-subagent-call__agent-chevron');

      summary.append(statusDot, info, badge, chevron);
      details.append(summary);

      const body = createElement('div', 'chat-subagent-call__agent-body');

      if (agent.prompt) {
        const promptSection = createElement('div', 'chat-subagent-call__agent-section');
        const promptTitle = createElement(
          'h4',
          'chat-subagent-call__agent-section-title',
          strings.tools.subAgentPromptSection,
        );
        const promptEl = renderMarkdown(agent.prompt, 'chat-subagent-call__agent-prompt');
        promptSection.append(promptTitle, promptEl);
        body.append(promptSection);
      }

      if (agent.output || agent.error) {
        const outputSection = createElement(
          'div',
          'chat-subagent-call__agent-section chat-subagent-call__agent-output-section',
        );
        const isError = Boolean(agent.error && !agent.output);
        const sectionTitle = createElement(
          'h4',
          'chat-subagent-call__agent-section-title',
          isError ? strings.tools.subAgentErrorSection : strings.tools.subAgentOutputSection,
        );
        outputSection.append(sectionTitle);
        const rawOutput = agent.output || agent.error || '';
        const { content: parsedOutput, thinking: outputThinking } =
          parseThinkingFromText(rawOutput);
        if (outputThinking) {
          const thinkWrap = document.createElement('details');
          thinkWrap.className = 'chat-message__thinking';
          const thinkSummary = createElement('summary', 'chat-message__thinking-summary');
          thinkSummary.append(
            createIcon('thinking', 'chat-message__thinking-icon'),
            createElement('span', 'chat-message__thinking-label', strings.composer.reasoning),
          );
          thinkWrap.append(thinkSummary);
          const thinkBody = createElement('div', 'chat-message__thinking-body');
          thinkBody.append(createElement('p', 'chat-message__thinking-text', outputThinking));
          thinkWrap.append(thinkBody);
          outputSection.append(thinkWrap);
        }
        outputSection.append(
          renderMarkdown(
            (parsedOutput || rawOutput).trimStart(),
            'chat-subagent-call__agent-output',
          ),
        );
        body.append(outputSection);
      }

      details.append(body);
      agentsContainer.append(details);
    }

    card.append(agentsContainer);
  }

  return card;
}

function createTerminalCallElement(terminal, strings) {
  if (Array.isArray(terminal.subAgents)) {
    return createSubAgentCallElement(terminal, strings);
  }

  const status = terminal.status ?? 'running';
  const card = createElement('section', `chat-terminal-call chat-terminal-call--${status}`);
  const header = createElement('div', 'chat-terminal-call__header');
  const identity = createElement('div', 'chat-terminal-call__identity');
  const icon = createIcon('terminal', 'chat-terminal-call__icon');
  const copy = createElement('div', 'chat-terminal-call__copy');
  const label = createElement(
    'div',
    'chat-terminal-call__label',
    terminal.label || strings.terminal.title,
  );
  const command = createElement(
    'div',
    'chat-terminal-call__command',
    terminal.command || terminal.summary || '',
  );
  copy.append(label, command);
  identity.append(icon, copy);
  const statusEl = createElement(
    'span',
    'chat-terminal-call__status',
    terminal.statusLabel ?? status,
  );
  header.append(identity, statusEl);
  card.append(header);

  const output = [terminal.output, terminal.error].filter(Boolean).join('\n\n').trim();
  if (output) {
    const details = document.createElement('details');
    details.className = 'chat-terminal-call__details';
    const summary = createElement('summary', 'chat-terminal-call__details-summary');
    summary.append(
      createIcon('chevronDown', 'chat-terminal-call__details-icon'),
      createElement('span', '', strings.terminal.outputLabel),
    );
    const pre = createElement('pre', 'chat-terminal-call__output', output);
    details.append(summary, pre);
    card.append(details);
  }

  return card;
}

function formatTerminalResultForModel(strings, action, result) {
  const payload = action?.payload ?? {};
  const lines = [
    strings.terminal.resultHeader,
    `Tool: ${getTerminalToolLabel(strings, action.tool)}`,
  ];

  if (payload.command) lines.push(`Command: ${payload.command}`);
  if (payload.branch) lines.push(`Branch: ${payload.branch}`);
  if (payload.message) lines.push(`Message: ${payload.message}`);
  if (result?.cwd) lines.push(`Working directory: ${result.cwd}`);
  if (result?.path) lines.push(`Path: ${result.path}`);
  if (result?.root) lines.push(`Workspace: ${result.root}`);
  if (result?.processId) lines.push(`Process id: ${result.processId}`);
  if (result?.running !== undefined) lines.push(`Running: ${result.running ? 'yes' : 'no'}`);
  if (Number.isFinite(result?.exitCode)) {
    lines.push(formatText(strings.terminal.exitCode, { code: String(result.exitCode) }));
  }
  if (result?.hint) lines.push(`Hint:\n${result.hint}`);
  if (result?.category) lines.push(`Category: ${result.category}`);
  if (result?.current) lines.push(`Current branch: ${result.current}`);
  if (Array.isArray(result?.branches)) lines.push(`Branches:\n${result.branches.join('\n')}`);
  if (result?.error) lines.push(`${strings.terminal.errorLabel}:\n${result.error}`);
  if (result?.stdout) lines.push(`STDOUT:\n${result.stdout}`);
  if (result?.stderr) lines.push(`STDERR:\n${result.stderr}`);
  if (result?.summary) lines.push(`Summary:\n${JSON.stringify(result.summary, null, 2)}`);
  if (Array.isArray(result?.matches)) {
    lines.push(`Matches:\n${JSON.stringify(result.matches, null, 2)}`);
  }
  if (Array.isArray(result?.entries)) {
    lines.push(`Entries:\n${JSON.stringify(result.entries, null, 2)}`);
  }
  if (result?.content) lines.push(`Content:\n${result.content}`);
  if (result?.buffer) lines.push(`Output buffer:\n${result.buffer}`);

  if (lines.length === 2) {
    lines.push(JSON.stringify(result ?? {}, null, 2));
  }

  return lines.join('\n\n');
}

function createChatTerminalPanel(strings, { onOpenChange } = {}) {
  let panelRef = null;
  let isOpen = false;

  // ── Tab state ──────────────────────────────────────────────────────────────
  // Each tab is an independent terminal session with its own cwd, history, and
  // running process. activeTabIndex always points into the tabs array.
  function createTabState() {
    return {
      cwd: '',
      outputValue: '',
      activeProcessId: null,
      isRunning: false,
      commandHistory: [],
      historyIndex: -1,
      currentInput: '',
    };
  }

  function getActiveTab() {
    return tabs[activeTabIndex] ?? tabs[0];
  }

  let activeTabIndex = 0;
  let tabs = [createTabState()];

  let outputEl = null;
  let inputEl = null;
  let promptEl = null;
  let statusText = null;

  function setStatus(text, tone = '') {
    if (!statusText) return;
    statusText.textContent = text;
    statusText.className = `chat-terminal-drawer__status${tone ? ` chat-terminal-drawer__status--${tone}` : ''}`;
  }

  function replaceOutput(text) {
    const tab = getActiveTab();
    if (!tab) return;
    tab.outputValue = String(text ?? '');
    if (outputEl) {
      outputEl.textContent = tab.outputValue;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  function appendOutputForTab(tabIndex, text) {
    const tab = tabs[tabIndex];
    if (!tab) return;
    tab.outputValue = `${tab.outputValue}${String(text ?? '')}`;
    if (tab.outputValue.length > 160000) {
      tab.outputValue = tab.outputValue.slice(tab.outputValue.length - 160000);
    }
    if (tabIndex === activeTabIndex && outputEl) {
      outputEl.textContent = tab.outputValue;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  function appendOutput(text) {
    appendOutputForTab(activeTabIndex, text);
  }

  function setRunning(running) {
    const tab = getActiveTab();
    if (tab) tab.isRunning = running;
    if (inputEl) {
      inputEl.disabled = running;
      if (!running) requestAnimationFrame(() => inputEl?.focus());
    }
    if (promptEl) {
      promptEl.classList.toggle('chat-terminal-drawer__prompt--running', running);
    }
  }

  function updatePrompt() {
    if (!promptEl) return;
    const cwd = getActiveTab()?.cwd ?? '';
    const short = cwd.length > 48 ? `\u2026${cwd.slice(-48)}` : cwd;
    promptEl.textContent = short ? `${short} >` : '>';
  }

  function syncCwd(nextCwd) {
    const tab = getActiveTab();
    if (tab) tab.cwd = nextCwd || tab.cwd;
    updatePrompt();
  }

  async function loadDefaultCwdForTab(tabIndex) {
    try {
      const result = await invokeIpc('terminal:get-default-cwd');
      if (result?.ok && tabs[tabIndex]) {
        tabs[tabIndex].cwd = result.cwd;
        if (tabIndex === activeTabIndex) updatePrompt();
      }
    } catch {
      // ignore
    }
  }

  async function loadDefaultCwd() {
    await loadDefaultCwdForTab(activeTabIndex);
  }

  async function assessCommand(command) {
    const result = await invokeIpc('terminal:assess-command-risk', { command });
    return result?.risk ?? { level: 'low', blocked: false, requiresOptIn: false, reasons: [] };
  }

  async function runCommand(command) {
    const nextCommand = String(command ?? '').trim();
    const tab = getActiveTab();
    const cwd = tab?.cwd ?? '';
    if (!nextCommand || tab?.isRunning) return;
    if (!cwd) {
      appendOutput(`${strings.terminal.noDirectory}\n`);
      return;
    }

    // ── cd is stateful — handle it here, not in the subprocess ────────────────
    const cdMatch = nextCommand.match(/^cd(?:\s+(.*))?$/);
    if (cdMatch) {
      const target = (cdMatch[1] ?? '').trim();
      appendOutput(`${nextCommand}\n`);
      if (tab.commandHistory[tab.commandHistory.length - 1] !== nextCommand) {
        tab.commandHistory.push(nextCommand);
      }
      tab.historyIndex = -1;
      tab.currentInput = '';
      const result = await invokeIpc('terminal:resolve-directory', { cwd, target });
      if (result?.ok) {
        syncCwd(result.cwd);
        setStatus(strings.terminal.idle);
      } else {
        appendOutput(`${result?.error || 'cd: no such file or directory'}\n`);
        setStatus(result?.error || 'Error', 'warning');
      }
      return;
    }

    if (tab.commandHistory[tab.commandHistory.length - 1] !== nextCommand) {
      tab.commandHistory.push(nextCommand);
    }
    tab.historyIndex = -1;
    tab.currentInput = '';

    appendOutput(`${nextCommand}\n`);
    setRunning(true);
    setStatus(strings.terminal.running, 'running');

    const risk = await assessCommand(nextCommand);
    if (risk.blocked) {
      setRunning(false);
      setStatus(strings.terminal.criticalRisk, 'danger');
      appendOutput(`${strings.terminal.criticalRisk}\n`);
      return;
    }

    try {
      const result = await invokeIpc('terminal:spawn-command', {
        command: nextCommand,
        cwd,
        allowRisky: false,
      });

      if (!result?.ok) {
        tab.activeProcessId = null;
        setRunning(false);
        setStatus(
          result?.error ?? strings.terminal.defaultError,
          result?.risk?.blocked ? 'danger' : 'warning',
        );
        appendOutput(`${result?.error ?? strings.terminal.defaultError}\n`);
        return;
      }

      tab.activeProcessId = result.processId;
    } catch (error) {
      tab.activeProcessId = null;
      setRunning(false);
      setStatus(error?.message ?? strings.terminal.defaultError, 'danger');
      appendOutput(`${error?.message ?? strings.terminal.defaultError}\n`);
    }
  }

  async function stopCommand() {
    const tab = getActiveTab();
    if (!tab?.activeProcessId) return;
    const processId = tab.activeProcessId;
    tab.activeProcessId = null;
    await invokeIpc('terminal:kill', processId).catch(() => {});
    setRunning(false);
    setStatus(strings.terminal.stopped, 'warning');
    appendOutput(`\n${strings.terminal.processStopped}\n`);
  }

  function wireProcessEvents() {
    onIpc('terminal:process-output', (payload) => {
      if (!payload?.processId) return;
      const tabIndex = tabs.findIndex((tab) => tab.activeProcessId === payload.processId);
      if (tabIndex < 0) return;
      appendOutputForTab(tabIndex, payload.text);
    });

    onIpc('terminal:process-exit', (payload) => {
      if (!payload?.processId) return;
      const tabIndex = tabs.findIndex((tab) => tab.activeProcessId === payload.processId);
      if (tabIndex < 0) return;
      const tab = tabs[tabIndex];
      const code = payload.code ?? 0;
      tab.activeProcessId = null;
      tab.isRunning = false;
      appendOutputForTab(
        tabIndex,
        `${formatText(strings.terminal.processExited, { code: String(code) })}\n`,
      );
      if (tabIndex === activeTabIndex) {
        setRunning(false);
        setStatus(strings.terminal.finished, code === 0 ? 'success' : 'danger');
      }
    });
  }

  function positionInitial() {
    if (!panelRef) return;
    const panelWidth = panelRef.offsetWidth;
    const panelHeight = panelRef.offsetHeight;
    const left = Math.max(38, Math.round((window.innerWidth - panelWidth) / 2));
    const top = Math.max(8, window.innerHeight - 142 - panelHeight);
    panelRef.style.left = `${left}px`;
    panelRef.style.top = `${top}px`;
  }

  function setOpen(nextOpen) {
    isOpen = Boolean(nextOpen);
    if (panelRef) panelRef.hidden = !isOpen;
    onOpenChange?.(isOpen);
    if (isOpen) {
      if (!getActiveTab()?.cwd) void loadDefaultCwd();
      requestAnimationFrame(() => {
        if (!panelRef.style.left) positionInitial();
        inputEl?.focus();
      });
    }
  }

  function build() {
    if (panelRef) return panelRef;

    const panel = createElement('aside', 'chat-terminal-drawer');
    panel.hidden = true;

    // ── Header ───────────────────────────────────────────────────────────
    const header = createElement('div', 'chat-terminal-drawer__header');

    const headerCopy = createElement('div', 'chat-terminal-drawer__header-copy');
    headerCopy.append(createElement('h2', 'chat-terminal-drawer__title', strings.terminal.title));

    const headerActions = createElement('div', 'chat-terminal-drawer__header-actions');
    statusText = createElement('span', 'chat-terminal-drawer__status', strings.terminal.idle);

    const copyButton = createElement(
      'button',
      'chat-terminal-drawer__output-button',
      strings.terminal.copy,
    );
    copyButton.type = 'button';
    copyButton.addEventListener('click', () => {
      navigator.clipboard
        .writeText(getActiveTab()?.outputValue ?? '')
        .then(() => {
          copyButton.textContent = strings.terminal.copied;
          setTimeout(() => {
            copyButton.textContent = strings.terminal.copy;
          }, 1200);
        })
        .catch(() => {});
    });

    const clearButton = createElement(
      'button',
      'chat-terminal-drawer__output-button',
      strings.terminal.clear,
    );
    clearButton.type = 'button';
    clearButton.addEventListener('click', () => {
      replaceOutput('');
      setStatus(strings.terminal.idle);
    });

    const closeButton = createElement('button', 'chat-terminal-drawer__close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', strings.terminal.close);
    closeButton.append(createIcon('close', 'chat-terminal-drawer__close-icon'));
    closeButton.addEventListener('click', () => setOpen(false));

    headerActions.append(statusText, copyButton, clearButton, closeButton);
    header.append(headerCopy, headerActions);

    // ── Output area ──────────────────────────────────────────────────────
    outputEl = createElement('pre', 'chat-terminal-drawer__output');
    outputEl.textContent = '';

    // ── Command input row ────────────────────────────────────────────────
    const inputRow = createElement('div', 'chat-terminal-drawer__input-row');
    promptEl = createElement('span', 'chat-terminal-drawer__prompt', '>');

    inputEl = createElement('input', 'chat-terminal-drawer__cmd-input');
    inputEl.type = 'text';
    inputEl.spellcheck = false;
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('autocorrect', 'off');
    inputEl.setAttribute('autocapitalize', 'off');

    inputEl.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        const command = inputEl.value.trim();
        const tab = getActiveTab();
        inputEl.value = '';
        if (tab) {
          tab.currentInput = '';
          tab.historyIndex = -1;
        }
        if (command) void runCommand(command);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const tab = getActiveTab();
        if (!tab || tab.commandHistory.length === 0) return;
        if (tab.historyIndex === -1) {
          tab.currentInput = inputEl.value;
          tab.historyIndex = tab.commandHistory.length - 1;
        } else if (tab.historyIndex > 0) {
          tab.historyIndex -= 1;
        }
        inputEl.value = tab.commandHistory[tab.historyIndex] ?? '';
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const tab = getActiveTab();
        if (!tab || tab.historyIndex === -1) return;
        if (tab.historyIndex < tab.commandHistory.length - 1) {
          tab.historyIndex += 1;
          inputEl.value = tab.commandHistory[tab.historyIndex];
        } else {
          tab.historyIndex = -1;
          inputEl.value = tab.currentInput;
        }
      } else if (event.key === 'c' && event.ctrlKey && getActiveTab()?.isRunning) {
        event.preventDefault();
        void stopCommand();
      }
    });

    inputRow.append(promptEl, inputEl);
    panel.append(header, outputEl, inputRow);
    panelRef = panel;

    // ── Drag ─────────────────────────────────────────────────────────────────
    let dragActive = false;
    let dragOriginX = 0;
    let dragOriginY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;

    function onDragStart(event) {
      if (event.button !== 0 || event.target.closest('button')) return;
      dragActive = true;
      dragOriginX = event.clientX;
      dragOriginY = event.clientY;
      dragStartLeft = parseInt(panel.style.left, 10) || 0;
      dragStartTop = parseInt(panel.style.top, 10) || 0;
      panel.classList.add('chat-terminal-drawer--dragging');
      event.preventDefault();
    }

    function onDragMove(event) {
      if (!dragActive) return;
      const dx = event.clientX - dragOriginX;
      const dy = event.clientY - dragOriginY;
      const maxLeft = window.innerWidth - panel.offsetWidth;
      const maxTop = window.innerHeight - panel.offsetHeight;
      panel.style.left = `${Math.max(0, Math.min(maxLeft, dragStartLeft + dx))}px`;
      panel.style.top = `${Math.max(0, Math.min(maxTop, dragStartTop + dy))}px`;
    }

    function onDragEnd() {
      if (!dragActive) return;
      dragActive = false;
      panel.classList.remove('chat-terminal-drawer--dragging');
    }

    header.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    // ── Resize ───────────────────────────────────────────────────────────────────
    const resizeHandle = createElement('div', 'chat-terminal-drawer__resize');
    panel.append(resizeHandle);

    let resizeActive = false;
    let resizeOriginX = 0;
    let resizeOriginY = 0;
    let resizeStartW = 0;
    let resizeStartOutputH = 0;

    function onResizeStart(event) {
      if (event.button !== 0) return;
      resizeActive = true;
      resizeOriginX = event.clientX;
      resizeOriginY = event.clientY;
      resizeStartW = panel.offsetWidth;
      resizeStartOutputH = outputEl ? outputEl.offsetHeight : 200;
      panel.classList.add('chat-terminal-drawer--resizing');
      event.preventDefault();
      event.stopPropagation();
    }

    function onResizeMove(event) {
      if (!resizeActive) return;
      const dx = event.clientX - resizeOriginX;
      const dy = event.clientY - resizeOriginY;
      const newW = Math.max(340, Math.min(window.innerWidth - 100, resizeStartW + dx));
      const newOutputH = Math.max(80, Math.min(window.innerHeight - 260, resizeStartOutputH + dy));
      panel.style.width = `${newW}px`;
      if (outputEl) outputEl.style.height = `${newOutputH}px`;
    }

    function onResizeEnd() {
      if (!resizeActive) return;
      resizeActive = false;
      panel.classList.remove('chat-terminal-drawer--resizing');
    }

    resizeHandle.addEventListener('mousedown', onResizeStart);
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);

    wireProcessEvents();
    void loadDefaultCwd();
    return panel;
  }

  return {
    build,
    toggle() {
      setOpen(!isOpen);
    },
    setOpen,
    isOpen() {
      return isOpen;
    },
  };
}

// ---------------------------------------------------------------------------
// Connection diagnostic — shown after 10 s of waiting for a response.
// Reuses the streaming assistant message's existing thinking block rather than
// creating a separate panel. The block label is temporarily switched to
// "Status" and diagnostic items are injected into its body. When real thinking
// content arrives the block silently reverts to normal reasoning display.
// ---------------------------------------------------------------------------

const DIAG_ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12"/></svg>`;
const DIAG_ICON_WARN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const DIAG_ICON_SPIN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;

function diagIconClass(tone) {
  if (tone === 'spin') return 'chat-diag__icon chat-diag__icon--spin';
  if (tone === 'warn') return 'chat-diag__icon chat-diag__icon--warn';
  if (tone === 'error') return 'chat-diag__icon chat-diag__icon--error';
  return 'chat-diag__icon';
}

function diagIconSvg(tone) {
  if (tone === 'spin') return DIAG_ICON_SPIN;
  if (tone === 'warn' || tone === 'error') return DIAG_ICON_WARN;
  return DIAG_ICON_CHECK;
}

// Takes `strings` so it can read diag.statusLabel and composer.reasoning.
function createDiagnosticPanel(strings) {
  let activeWrap = null;
  let itemsContainer = null;

  function addItem(text, tone = 'ok') {
    if (!itemsContainer) return { update() {} };
    const item = createElement('div', 'chat-diag__item');
    const iconEl = createElement('span', diagIconClass(tone));
    iconEl.innerHTML = diagIconSvg(tone);
    const textEl = createElement('span', 'chat-diag__text', text);
    item.append(iconEl, textEl);
    itemsContainer.append(item);
    activeWrap?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return {
      update(nextText, nextTone = 'ok') {
        iconEl.className = diagIconClass(nextTone);
        iconEl.innerHTML = diagIconSvg(nextTone);
        textEl.textContent = nextText;
      },
    };
  }

  function show(threadEl) {
    // Find the last thinking block inside the last streaming assistant message.
    const allWraps = threadEl?.querySelectorAll('.chat-message__thinking');
    const wrap = allWraps?.length ? allWraps[allWraps.length - 1] : null;
    if (!wrap) return;

    activeWrap = wrap;
    const label = wrap.querySelector('.chat-message__thinking-label');
    const body = wrap.querySelector('.chat-message__thinking-body');
    if (!body) return;

    // Save the original label text so we can restore it if real thinking arrives.
    if (label) {
      label.dataset.originalText = label.textContent;
      label.textContent = strings.diag.statusLabel;
    }

    // Mark status mode so updateLastStreamingMessage knows to exit gracefully.
    wrap.dataset.statusMode = 'true';
    wrap.hidden = false;
    wrap.open = true;

    // Replace the thinking body with a fresh items container.
    itemsContainer = createElement('div', 'chat-diag');
    body.replaceChildren(itemsContainer);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        itemsContainer?.classList.add('chat-diag--visible');
        wrap.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }),
    );
  }

  function hide() {
    if (!activeWrap) return;

    const label = activeWrap.querySelector('.chat-message__thinking-label');
    const body = activeWrap.querySelector('.chat-message__thinking-body');

    // Restore original label.
    if (label?.dataset.originalText) {
      label.textContent = label.dataset.originalText;
      delete label.dataset.originalText;
    }

    // Exit status mode and collapse the block.
    delete activeWrap.dataset.statusMode;
    activeWrap.open = false;
    activeWrap.hidden = true;
    if (body) body.replaceChildren(createElement('p', 'chat-message__thinking-text', ''));

    activeWrap = null;
    itemsContainer = null;
  }

  return { addItem, show, hide };
}

// Probe a URL and return { ok, ms }. Uses no-cors so the host just needs to
// be reachable; we don't need to read the response body.
async function measureFetch(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    await fetch(url, { signal: controller.signal, mode: 'no-cors', cache: 'no-store' });
    return { ok: true, ms: Date.now() - t0 };
  } catch {
    return { ok: false, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

// Extract just the protocol + host from a provider endpoint string so we can
// do a lightweight reachability probe without needing auth.
function resolveProviderBaseUrl(provider, userProviderDetails) {
  const details = userProviderDetails?.[provider.id] ?? {};
  const endpoint =
    collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint) || '';
  if (!endpoint) return null;
  try {
    const url = new URL(endpoint.replace('{model}', 'probe'));
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export async function createChatView(
  strings,
  {
    getActiveProject,
    onActiveProjectChange,
    getActivePersona,
    onActivePersonaChange,
    getProfile,
    onNavigate,
    onOpenSettings,
  } = {},
) {
  initCompletionSound();

  const [payload, appSettings] = await Promise.all([
    invokeIpc('chat:bootstrap'),
    invokeIpc('app-settings:get').catch(() => null),
  ]);
  const view = createElement('div', 'chat-view');
  const profile = getProfile?.() ?? payload.user?.profile ?? {};
  const firstName = getFirstName(profile.name, strings.appName);
  const hour = new Date().getHours();
  const isBirthday = isBirthdayToday(profile.dateOfBirth);
  const isChristmas = !isBirthday && isChristmasToday();
  const isNewYear = !isBirthday && !isChristmas && isNewYearToday();
  const greetings = getTimeGreetings(hour, firstName);

  // Resolve the active provider/model. A user-configured default model (set
  // in App Settings) takes precedence; if none is set we fall back to the
  // auto-detected preferred provider.
  let activeProvider = null;
  let activeModel = null;
  let activeModelLabel = strings.composer.modelFallback;

  const dm = appSettings?.defaultModel;
  if (dm?.providerId && dm?.modelId) {
    const dmProvider = payload.providers.find((p) => p.id === dm.providerId) ?? null;
    const dmModel = dmProvider?.models?.find((m) => m.id === dm.modelId) ?? null;
    if (dmProvider && dmModel) {
      activeProvider = dmProvider;
      activeModel = dmModel;
      activeModelLabel = dmModel.name ?? dmModel.id;
    }
  }

  if (!activeProvider) {
    activeProvider = getPreferredProvider(payload);
    activeModel = activeProvider?.models?.[0] ?? null;
    activeModelLabel =
      activeModel?.name ?? activeProvider?.featuredModels?.[0] ?? strings.composer.modelFallback;
  }
  let activePersona = getActivePersona?.() ?? null;
  let activeProject = getActiveProject?.() ?? null;
  let draftValue = '';
  let pendingAttachments = [];
  let attachmentNoticeTimer = null;
  let isSending = false;
  let isEnhancing = false;
  let isPrivate = false;
  let accText = '';
  let accThinking = '';
  let sessionId = null;
  let sessionCreatedAt = null;
  let messages = [];
  let prevHasMessages = false;
  let streamDisposers = [];
  let generationToken = 0;
  let modelPickerPanel = null;
  let modelPickerDispose = null;
  let modelPickerOpen = false;
  let terminalPanel = null;
  let scrollToBottomBtn = null;
  let diagTimer = null;
  let diagPanel = null;
  let toolsetPrompt = null;
  let slashCommandsLoaded = false;
  let track = null;
  let trackLabel = null;
  let slashCommands = [];
  let slashFilteredCommands = [];
  let slashSelectedIndex = 0;
  let slashStartIndex = 0;
  let activeMode = null;
  let activeModeInstruction = null;
  let terminalProcessRenderFrame = null;
  let terminalProcessCardsWired = false;

  let conversationEntering = false;

  let userScrolledUp = false;
  let scrollToBottomFrame = null;

  function isNearBottom() {
    if (!scroll) return true;
    return scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
  }

  function scheduleScrollToBottom() {
    if (userScrolledUp) return;
    if (scrollToBottomFrame) return;
    scrollToBottomFrame = requestAnimationFrame(() => {
      scrollToBottomFrame = null;
      if (!userScrolledUp && scroll) scroll.scrollTop = scroll.scrollHeight;
    });
  }

  function syncScrollToBottomBtn() {
    if (!scrollToBottomBtn) return;
    scrollToBottomBtn.classList.toggle('chat-scroll-to-bottom-btn--visible', userScrolledUp);
  }

  let composerField = null;
  let attachmentsEl = null;
  let attachmentNotice = null;
  let slashMenu = null;
  let slashScroller = null;
  let sendButton = null;
  let enhanceBtn = null;
  let attachBtn = null;
  let terminalBtn = null;
  let thread = null;
  let title = null;
  let bubblesEl = null;
  let composer = null;
  let scroll = null;
  let bottom = null;

  let projectPill = null;
  let projectNameEl = null;
  let projectMetaEl = null;
  let gitBarEl = null;
  let gitBranchEl = null;
  let gitMetaEl = null;
  let gitStatusDotEl = null;
  let gitPrimaryBtn = null;
  let gitSecondaryBtn = null;
  let gitRefreshBtn = null;
  let gitRefreshTimer = null;
  let gitState = null;
  let gitBusy = false;
  let modelButton = null;

  function scheduleTerminalProcessRender() {
    if (terminalProcessRenderFrame) return;
    terminalProcessRenderFrame = requestAnimationFrame(() => {
      terminalProcessRenderFrame = null;
      renderThread();
    });
  }

  function appendTerminalCardOutput(currentOutput, nextText) {
    const output = `${String(currentOutput ?? '')}${String(nextText ?? '')}`;
    return output.length > 96000 ? output.slice(output.length - 96000) : output;
  }

  function updateTerminalProcessCard(processId, updater) {
    const id = String(processId ?? '').trim();
    if (!id) return;

    let changed = false;
    messages = messages.map((message) => {
      if (message.terminal?.processId !== id) return message;
      changed = true;
      return {
        ...message,
        terminal: updater(message.terminal),
      };
    });

    if (changed) scheduleTerminalProcessRender();
  }

  function wireTerminalProcessCards() {
    if (terminalProcessCardsWired) return;
    terminalProcessCardsWired = true;

    onIpc('terminal:process-output', (payload) => {
      updateTerminalProcessCard(payload?.processId, (terminal) => ({
        ...terminal,
        status: 'running',
        statusLabel: strings.terminal.running,
        output: appendTerminalCardOutput(terminal.output, payload?.text ?? ''),
      }));
    });

    onIpc('terminal:process-exit', (payload) => {
      const exitLine = `\n${formatText(strings.terminal.processExited, { code: String(payload?.code ?? 0) })}\n`;
      updateTerminalProcessCard(payload?.processId, (terminal) => ({
        ...terminal,
        status: payload?.code === 0 ? 'completed' : 'failed',
        statusLabel:
          payload?.code === 0 ? strings.terminal.completedTool : strings.terminal.failedTool,
        output: appendTerminalCardOutput(terminal.output, exitLine),
        exitCode: payload?.code ?? 0,
      }));
    });
  }

  if (!activePersona) {
    try {
      activePersona = await invokeIpc('personas:load-persona', 'Joanium', 'Joana.md');
      onActivePersonaChange?.(activePersona);
    } catch (error) {
      console.error('[Joanium] Failed to load default persona:', error);
    }
  }

  function showAttachmentNotice(message, tone = 'info') {
    if (!attachmentNotice) return;

    clearTimeout(attachmentNoticeTimer);
    attachmentNotice.textContent = message;
    attachmentNotice.hidden = false;
    attachmentNotice.className = `chat-composer__notice chat-composer__notice--${tone}`;

    attachmentNoticeTimer = setTimeout(() => {
      if (attachmentNotice) {
        attachmentNotice.hidden = true;
        attachmentNotice.textContent = '';
      }
    }, 3200);
  }

  function renderPendingAttachments() {
    if (!attachmentsEl) return;

    attachmentsEl.replaceChildren();
    attachmentsEl.hidden = pendingAttachments.length === 0;

    for (const attachment of pendingAttachments) {
      attachmentsEl.append(
        createAttachmentPill(attachment, strings, {
          removable: true,
          onRemove(id) {
            pendingAttachments = pendingAttachments.filter((item) => item.id !== id);
            renderPendingAttachments();
            syncComposer();
            focusComposer();
          },
        }),
      );
    }
  }

  async function selectAttachments() {
    if (isSending) return;
    const allowImages = activeModel?.inputs?.image === true;

    try {
      const result = await invokeIpc('chat:select-attachments', { allowImages });
      const incoming = Array.isArray(result?.attachments) ? result.attachments : [];
      const rejected = Array.isArray(result?.rejected) ? result.rejected : [];

      if (incoming.length > 0) {
        pendingAttachments = [...pendingAttachments, ...incoming];
        renderPendingAttachments();
        syncComposer();
      } else if (rejected.length === 0) {
        attachmentNotice.hidden = true;
      }

      if (rejected.length > 0) {
        showAttachmentNotice(
          formatText(strings.composer.attachmentRejected, { count: String(rejected.length) }),
          'warning',
        );
      }
    } catch (error) {
      showAttachmentNotice(
        formatText(strings.composer.attachmentFailed, {
          message: error?.message ?? String(error),
        }),
        'warning',
      );
    } finally {
      focusComposer();
    }
  }

  function removeStreamListeners() {
    for (const dispose of streamDisposers) {
      dispose();
    }
    streamDisposers = [];
  }

  async function saveCurrentSession() {
    if (isPrivate) return;
    if (!sessionId || messages.length === 0) return;
    const firstUser = messages.find((message) => message.role === 'user');
    if (!firstUser) return;

    const now = new Date().toISOString();
    const sessionMessages = messages
      .filter(
        (message) => !message.hidden && !message.streaming && !message.pending && message.content,
      )
      .map(({ role, content, thinking, modelContent, attachments, terminal }) => {
        const entry = { role, content };
        if (thinking) entry.thinking = thinking;
        if (modelContent && modelContent !== content) entry.modelContent = modelContent;
        if (attachments?.length) entry.attachments = attachments.map(toAttachmentSummary);
        if (terminal) entry.terminal = terminal;
        return entry;
      });

    const sessionData = {
      id: sessionId,
      title: truncate(collapseWhitespace(firstUser.content), 60),
      createdAt: sessionCreatedAt ?? now,
      updatedAt: now,
      messages: sessionMessages,
    };

    if (activeProject?.id) {
      sessionData.projectId = activeProject.id;
    }

    await invokeIpc('history:save-session', sessionData);
  }

  function buildProjectContext(project) {
    if (!project) return '';

    const lines = [formatText(strings.projects.systemContextName, { name: project.name ?? '' })];
    const info = collapseWhitespace(project.info);
    const folder = collapseWhitespace(project.folderPath ?? project.rootPath);

    if (info) {
      lines.push(formatText(strings.projects.systemContextInfo, { info }));
    }

    if (folder) {
      lines.push(formatText(strings.projects.systemContextFolder, { folder }));
      lines.push(strings.projects.systemContextGit);
    }

    return lines.filter(Boolean).join('\n');
  }

  async function loadMemoryContext() {
    try {
      return await invokeIpc('memory:get-context', 24000);
    } catch {
      return '';
    }
  }

  async function loadToolsetPrompt() {
    if (toolsetPrompt !== null) {
      return toolsetPrompt;
    }

    try {
      const result = await invokeIpc('toolset:list-tools');
      toolsetPrompt = result?.ok ? (result.systemPrompt ?? '') : '';
    } catch {
      toolsetPrompt = '';
    }

    return toolsetPrompt;
  }

  function applyActiveProject(project) {
    activeProject = project
      ? {
          id: project.id,
          name: project.name ?? '',
          icon: project.icon ?? '',
          info: project.info ?? '',
          folderPath: project.folderPath ?? project.rootPath ?? '',
          rootPath: project.rootPath ?? project.folderPath ?? '',
          coverImagePath: project.coverImagePath ?? '',
        }
      : null;
    syncActiveProjectPill();
  }

  function clearActiveProject() {
    applyActiveProject(null);
    onActiveProjectChange?.(null);
  }

  function getActiveProjectFolder() {
    return collapseWhitespace(activeProject?.folderPath ?? activeProject?.rootPath);
  }

  function parseGitStatusOutput(stdout = '') {
    const lines = String(stdout ?? '')
      .split(/\r?\n/)
      .filter(Boolean);
    const header = lines[0] ?? '';
    const branchMatch = header.match(/^## (?:No commits yet on )?(.+?)(?:\.\.\.|\s|$)/);
    const aheadMatch = header.match(/ahead (\d+)/);
    const behindMatch = header.match(/behind (\d+)/);
    const dirty = lines.slice(1).some((line) => line.trim());

    return {
      branch: branchMatch?.[1]?.trim() || strings.git.unknownBranch,
      dirty,
      ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
      behind: behindMatch ? Number(behindMatch[1]) : 0,
    };
  }

  function setGitBarBusy(busy) {
    gitBusy = busy;
    for (const button of [gitPrimaryBtn, gitSecondaryBtn, gitRefreshBtn]) {
      if (button) button.disabled = busy;
    }
  }

  function syncGitBarView() {
    if (
      !gitBarEl ||
      !gitBranchEl ||
      !gitMetaEl ||
      !gitStatusDotEl ||
      !gitPrimaryBtn ||
      !gitSecondaryBtn
    )
      return;

    if (!activeProject || !gitState) {
      gitBarEl.hidden = true;
      gitBranchEl.textContent = '';
      gitMetaEl.textContent = '';
      return;
    }

    gitBarEl.hidden = false;
    gitBranchEl.textContent = gitState.branch;
    gitStatusDotEl.classList.toggle('chat-gitbar__dot--dirty', gitState.dirty);
    gitStatusDotEl.classList.toggle('chat-gitbar__dot--clean', !gitState.dirty);

    const meta = [];
    meta.push(gitState.dirty ? strings.git.dirty : strings.git.clean);
    if (gitState.ahead > 0)
      meta.push(formatText(strings.git.ahead, { count: String(gitState.ahead) }));
    if (gitState.behind > 0)
      meta.push(formatText(strings.git.behind, { count: String(gitState.behind) }));
    gitMetaEl.textContent = meta.join(' · ');

    const primaryAction = gitState.dirty ? 'diff' : gitState.ahead > 0 ? 'push' : 'pull';
    gitPrimaryBtn._gitAction = primaryAction;
    gitPrimaryBtn.textContent = strings.git.actions[primaryAction];

    const secondaryAction = gitState.dirty && gitState.ahead > 0 ? 'push' : 'status';
    gitSecondaryBtn._gitAction = secondaryAction;
    gitSecondaryBtn.textContent = strings.git.actions[secondaryAction];
  }

  async function refreshProjectGitStatus({ silent = false } = {}) {
    const workingDir = getActiveProjectFolder();
    if (!workingDir) {
      gitState = null;
      syncGitBarView();
      return;
    }

    try {
      const result = await invokeIpc('terminal:git-status', { workingDir });
      if (!result?.ok || result.exitCode !== 0) {
        gitState = null;
        syncGitBarView();
        return;
      }

      gitState = parseGitStatusOutput(result.stdout);
      syncGitBarView();
    } catch (error) {
      gitState = null;
      syncGitBarView();
      if (!silent) showAttachmentNotice(error?.message ?? strings.git.refreshFailed, 'warning');
    }
  }

  function restartGitStatusTimer() {
    if (gitRefreshTimer) {
      clearInterval(gitRefreshTimer);
      gitRefreshTimer = null;
    }

    if (getActiveProjectFolder()) {
      gitRefreshTimer = setInterval(() => {
        void refreshProjectGitStatus({ silent: true });
      }, 15000);
    }
  }

  function appendGitResultMessage(label, command, result) {
    const output =
      [result?.stdout, result?.stderr]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .join('\n\n') ||
      result?.hint ||
      result?.error ||
      strings.git.emptyOutput;

    messages = [
      ...messages,
      {
        role: 'assistant',
        content: label,
        terminal: {
          label,
          command,
          status: result?.ok ? 'completed' : 'failed',
          statusLabel: result?.ok ? strings.terminal.completedTool : strings.terminal.failedTool,
          output,
          error: result?.ok ? null : result?.error,
          exitCode: result?.exitCode ?? 0,
        },
      },
    ];

    renderThread();
    scheduleScrollToBottom();
    void saveCurrentSession();
  }

  async function runGitBarAction(action) {
    if (gitBusy) return;
    const workingDir = getActiveProjectFolder();
    if (!workingDir) {
      showAttachmentNotice(strings.git.noProjectFolder, 'warning');
      return;
    }

    const channel = {
      status: 'terminal:git-status',
      diff: 'terminal:git-diff',
      pull: 'terminal:git-pull',
      push: 'terminal:git-push',
    }[action];

    if (!channel) return;
    setGitBarBusy(true);

    try {
      const result = await invokeIpc(channel, {
        workingDir,
        allowRisky: action === 'pull' || action === 'push',
      });
      appendGitResultMessage(
        strings.git.resultLabels[action],
        strings.git.commands[action],
        result,
      );

      if (action === 'pull' || action === 'push') {
        showAttachmentNotice(
          result?.ok
            ? strings.git.actionComplete
            : result?.hint || result?.error || strings.git.actionFailed,
          result?.ok ? 'info' : 'warning',
        );
      }

      await refreshProjectGitStatus({ silent: true });
    } catch (error) {
      showAttachmentNotice(error?.message ?? strings.git.actionFailed, 'warning');
    } finally {
      setGitBarBusy(false);
    }
  }

  function syncActiveProjectPill() {
    if (!projectPill || !projectNameEl || !projectMetaEl) return;

    if (!activeProject) {
      projectPill.hidden = true;
      projectNameEl.textContent = '';
      projectMetaEl.textContent = '';
      gitState = null;
      syncGitBarView();
      restartGitStatusTimer();
      return;
    }

    projectPill.hidden = false;
    projectNameEl.textContent = activeProject.name;
    projectMetaEl.textContent =
      collapseWhitespace(activeProject.folderPath ?? activeProject.rootPath) ||
      strings.projects.activeHint;
    void refreshProjectGitStatus({ silent: true });
    restartGitStatusTimer();
  }

  async function loadSession(id) {
    try {
      const session = await invokeIpc('history:load-session', id, activeProject?.id);
      messages = (session.messages ?? [])
        .map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: typeof message.content === 'string' ? message.content : '',
          modelContent: typeof message.modelContent === 'string' ? message.modelContent : null,
          attachments: Array.isArray(message.attachments)
            ? message.attachments.map(toAttachmentSummary)
            : [],
          terminal: message.terminal ?? null,
          thinking: message.thinking ?? '',
          streaming: false,
        }))
        .filter((message) => message.content);

      sessionId = session.id;
      sessionCreatedAt = session.createdAt ?? new Date().toISOString();
      renderThread();
      focusComposer();
    } catch (error) {
      console.error('[Joanium] Failed to load session:', error);
    }
  }

  function closeModelPicker() {
    modelPickerPanel?.classList.remove('chat-model-picker--open');
    modelButton?.classList.remove('chat-composer__model--open');
    modelPickerDispose?.();
    modelPickerDispose = null;
    modelPickerOpen = false;
  }

  function syncPickerActiveStates() {
    if (!modelPickerPanel) return;

    for (const option of modelPickerPanel.querySelectorAll('.chat-model-picker__option')) {
      const isActive =
        option._pickerProviderId === activeProvider?.id &&
        option._pickerModelId === activeModel?.id;
      option.classList.toggle('chat-model-picker__option--active', isActive);
      const existing = option.querySelector('.chat-model-picker__check');
      if (isActive && !existing) {
        option.append(createIcon('check', 'chat-model-picker__check'));
      } else if (!isActive && existing) {
        existing.remove();
      }
    }
  }

  function openModelPicker(triggerButton) {
    if (modelPickerOpen) {
      closeModelPicker();
      return;
    }

    if (!modelPickerPanel) {
      const picker = createModelPickerPanel({
        providers: payload.providers,
        userProviderDetails: payload.user?.providers?.details ?? {},
        strings,
        onSelect(provider, model) {
          activeProvider = provider;
          activeModel = model;
          activeModelLabel = model.name ?? model.id;
          userOverrodeModel = true;
          const labelEl = triggerButton.querySelector('.chat-composer__model-label');
          if (labelEl) labelEl.textContent = activeModelLabel;
          syncPickerActiveStates();
          closeModelPicker();
        },
      });
      modelPickerPanel = picker.element;
      modelPickerDispose = picker.dispose;
    }

    syncPickerActiveStates();
    modelPickerOpen = true;
    modelButton.classList.add('chat-composer__model--open');
    const rect = triggerButton.getBoundingClientRect();
    modelPickerPanel.style.left = `${rect.left}px`;
    modelPickerPanel.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    requestAnimationFrame(() => modelPickerPanel?.classList.add('chat-model-picker--open'));

    const onDocClick = (event) => {
      if (!modelPickerPanel?.contains(event.target) && !triggerButton.contains(event.target)) {
        closeModelPicker();
        document.removeEventListener('click', onDocClick, { capture: true });
        document.removeEventListener('keydown', onDocKey);
      }
    };
    const onDocKey = (event) => {
      if (event.key === 'Escape') {
        closeModelPicker();
        document.removeEventListener('click', onDocClick, { capture: true });
        document.removeEventListener('keydown', onDocKey);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', onDocClick, { capture: true });
      document.addEventListener('keydown', onDocKey);
    }, 0);
  }

  function normalizeSlashId(value = '') {
    return String(value ?? '')
      .trim()
      .replace(/^\/+/, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  async function ensureSlashCommandsLoaded() {
    if (slashCommandsLoaded) return;

    let baseCommands = [];
    try {
      const rawCommands = await invokeIpc('slash-commands:list');
      baseCommands = (Array.isArray(rawCommands) ? rawCommands : []).map((command) => ({
        ...command,
        id: normalizeSlashId(command.id),
      }));
    } catch {
      // SlashCommands package unavailable — palette still works for templates and agents.
    }
    const templateCommands = [];
    const agentCommands = [];

    try {
      const templates = await invokeIpc('templates:list-templates');
      for (const template of Array.isArray(templates) ? templates : []) {
        const id = normalizeSlashId(template.command || template.id || template.name);
        if (!id || !template.prompt) continue;
        templateCommands.push({
          id,
          label: template.name || id,
          description: template.prompt.slice(0, 90),
          type: 'template',
          icon: 'tabTemplates',
          prompt: template.prompt,
        });
      }
    } catch {
      // Templates are optional.
    }

    try {
      const agents = await invokeIpc('agents:list-agents');
      for (const agent of Array.isArray(agents) ? agents : []) {
        const id = normalizeSlashId(agent.id || agent.name);
        if (!id || !agent.prompt) continue;
        agentCommands.push({
          id,
          label: agent.name || id,
          description: agent.prompt.slice(0, 90),
          type: 'agent',
          icon: 'tabAgents',
          prompt: agent.prompt,
        });
      }
    } catch {
      // Agents are optional.
    }

    slashCommands = [...baseCommands, ...templateCommands, ...agentCommands];
    slashCommandsLoaded = true;
  }

  function closeSlashMenu() {
    slashFilteredCommands = [];
    slashSelectedIndex = 0;
    if (slashMenu) {
      slashMenu.hidden = true;
      slashMenu.classList.remove('chat-slash-menu--open');
      slashScroller?.replaceChildren();
    }
  }

  function renderSlashMenu() {
    if (!slashMenu || !slashScroller) return;

    slashScroller.replaceChildren();
    if (slashFilteredCommands.length === 0) {
      slashMenu.hidden = true;
      return;
    }

    const groups = [
      ['action', strings.slash.sections.actions],
      ['mode', strings.slash.sections.modes],
      ['navigate', strings.slash.sections.navigate],
      ['template', strings.slash.sections.templates],
      ['agent', strings.slash.sections.agents],
    ];

    let globalIndex = 0;
    for (const [type, sectionLabel] of groups) {
      const commands = slashFilteredCommands.filter((command) => command.type === type);
      if (commands.length === 0) continue;

      slashScroller.append(createElement('div', 'chat-slash-menu__section', sectionLabel));

      for (const command of commands) {
        const item = createElement(
          'button',
          `chat-slash-menu__item${globalIndex === slashSelectedIndex ? ' chat-slash-menu__item--active' : ''}`,
        );
        item.type = 'button';
        item._slashIndex = globalIndex;
        item._slashCommand = command;
        item.setAttribute('aria-selected', String(globalIndex === slashSelectedIndex));

        const icon = createIcon(command.icon || 'terminal', 'chat-slash-menu__icon');
        const copy = createElement('span', 'chat-slash-menu__copy');
        const label = createElement('span', 'chat-slash-menu__label');
        label.append(
          createElement('span', 'chat-slash-menu__slash', '/'),
          createElement('span', 'chat-slash-menu__id', command.id),
          createElement('span', 'chat-slash-menu__name', command.label),
        );
        const description = createElement(
          'span',
          'chat-slash-menu__description',
          command.description || '',
        );
        copy.append(label, description);
        const badge = createElement(
          'span',
          `chat-slash-menu__badge chat-slash-menu__badge--${command.type}`,
          strings.slash.badges[command.type] ?? command.type,
        );
        item.append(icon, copy, badge);
        item.addEventListener('mouseenter', () => {
          slashSelectedIndex = item._slashIndex;
          updateSlashActiveState();
        });
        item.addEventListener('click', () => {
          applySlashCommand(command);
        });
        slashScroller.append(item);
        globalIndex += 1;
      }
    }

    slashMenu.hidden = false;
    requestAnimationFrame(() => slashMenu?.classList.add('chat-slash-menu--open'));
  }

  function getSlashQuery() {
    if (!composerField) return null;

    const cursor = composerField.selectionStart;
    const beforeCursor = draftValue.slice(0, cursor);
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const currentLine = beforeCursor.slice(lineStart);
    const match = currentLine.match(/(^|\s)(\/[a-z0-9_-]*)$/i);
    if (!match) return null;

    const token = match[2];
    slashStartIndex = lineStart + currentLine.length - token.length;
    return token.slice(1).toLowerCase();
  }

  async function updateSlashMenu() {
    const query = getSlashQuery();
    if (query === null) {
      closeSlashMenu();
      return;
    }

    await ensureSlashCommandsLoaded();
    slashFilteredCommands = slashCommands.filter(
      (command) =>
        command.id.includes(query) ||
        String(command.label ?? '')
          .toLowerCase()
          .includes(query) ||
        String(command.description ?? '')
          .toLowerCase()
          .includes(query),
    );
    slashSelectedIndex = 0;
    renderSlashMenu();
  }

  function setDraftValue(nextValue, cursorPosition = nextValue.length) {
    draftValue = nextValue;
    syncComposer();
    if (composerField) {
      composerField.focus();
      composerField.setSelectionRange(cursorPosition, cursorPosition);
    }
    void updateSlashMenu();
  }

  function removeSlashToken(replacement = '') {
    if (!composerField) return;
    const cursor = composerField.selectionStart;
    const before = draftValue.slice(0, slashStartIndex);
    const after = draftValue.slice(cursor);
    setDraftValue(`${before}${replacement}${after}`, before.length + replacement.length);
  }

  function applySlashCommand(command) {
    closeSlashMenu();

    // Templates and agents paste their prompt into the composer.
    if (command.type === 'template' || command.type === 'agent') {
      removeSlashToken(command.prompt || '');
      return;
    }

    removeSlashToken('');

    // ── Actions ───────────────────────────────────────────────────────────────
    // Dispatched by the `action` field defined in Core/Commands.js.
    // To add a new action command, add it to Commands.js with an `action` value
    // that matches one of the cases below. Only add a new case here when you
    // need a genuinely new kind of side effect.
    if (command.type === 'action') {
      switch (command.action) {
        case 'clearConversation':
          clearConversation();
          break;

        case 'openTerminal':
          terminalPanel?.setOpen(true);
          focusComposer();
          break;

        case 'openSettings':
          onOpenSettings?.();
          break;

        case 'switchTheme': {
          const mode = command.payload?.mode;
          if (mode) {
            // Apply immediately so the switch feels instant.
            document.documentElement.classList.remove('joanium-theme-light', 'joanium-theme-dark');
            document.documentElement.classList.add(`joanium-theme-${mode}`);
            // Persist — preserve the existing motion preference.
            invokeIpc('themes:get')
              .then((state) => invokeIpc('themes:save', { motion: state?.motion ?? 'full', mode }))
              .catch(() => invokeIpc('themes:save', { mode, motion: 'full' }).catch(() => {}));
            // Notify any open panels (e.g. ThemePanel) so their UI stays in sync.
            window.dispatchEvent(new CustomEvent('joanium:theme-changed', { detail: { mode } }));
            focusComposer();
          }
          break;
        }
      }
      return;
    }

    // ── Modes ─────────────────────────────────────────────────────────────────
    // Toggles a persistent system-prompt instruction for the session.
    if (command.type === 'mode') {
      if (activeMode === command.id) {
        activeMode = null;
        activeModeInstruction = null;
      } else {
        activeMode = command.id;
        activeModeInstruction = null;
        invokeIpc('slash-commands:get-mode-instruction', command.id)
          .then((instruction) => {
            activeModeInstruction = instruction ?? null;
          })
          .catch(() => {});
      }
      focusComposer();
      return;
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    // Routes to the shell panel whose id matches command.id.
    if (command.type === 'navigate') {
      void onNavigate?.(command.id);
    }
  }

  function getModeInstruction() {
    return activeModeInstruction;
  }

  function updateSlashActiveState() {
    if (!slashMenu) return;
    const items = slashMenu.querySelectorAll('.chat-slash-menu__item');
    items.forEach((item, i) => {
      const isActive = i === slashSelectedIndex;
      item.classList.toggle('chat-slash-menu__item--active', isActive);
      item.setAttribute('aria-selected', String(isActive));
      if (isActive) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function handleSlashKeydown(event) {
    if (!slashMenu || slashMenu.hidden || slashFilteredCommands.length === 0) {
      return false;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      slashSelectedIndex = Math.min(slashSelectedIndex + 1, slashFilteredCommands.length - 1);
      updateSlashActiveState();
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      slashSelectedIndex = Math.max(slashSelectedIndex - 1, 0);
      updateSlashActiveState();
      return true;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      applySlashCommand(slashFilteredCommands[slashSelectedIndex]);
      return true;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeSlashMenu();
      return true;
    }

    return false;
  }

  function stopStream() {
    generationToken += 1;
    clearTimeout(diagTimer);
    diagTimer = null;
    diagPanel?.hide();
    markCompletionSoundAborted();
    removeStreamListeners();
    const stoppedNote = strings.composer.generationStopped;
    messages = messages.map((message, index) => {
      if (index !== messages.length - 1) return message;
      const { content: parsedStopped, thinking: inlineStopped } = parseThinkingFromText(accText);
      const cleanedStopped = stripNativeToolCalls(stripToolCallBlocks(parsedStopped));
      const content = cleanedStopped ? `${cleanedStopped}\n\n${stoppedNote}` : stoppedNote;
      return {
        role: 'assistant',
        content,
        thinking: accThinking || inlineStopped,
        streaming: false,
        stopped: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel,
      };
    });
    accText = '';
    accThinking = '';
    isSending = false;
    void saveCurrentSession();
    syncComposer();
    renderThread();
  }

  async function enhancePrompt() {
    const raw = draftValue.trim();
    if (!raw || isEnhancing || isSending) return;

    isEnhancing = true;
    syncComposer();

    try {
      const result = await invokeIpc('chat:enhance-prompt', {
        raw,
        providerId: activeProvider?.id ?? null,
        modelId: activeModel?.id ?? null,
      });

      const enhanced = result?.text?.trim();
      if (enhanced) {
        draftValue = enhanced;
        syncComposer();
        focusComposer();
      } else {
        showAttachmentNotice(strings.composer.enhanceFailed, 'warning');
      }
    } catch {
      showAttachmentNotice(strings.composer.enhanceFailed, 'warning');
    } finally {
      isEnhancing = false;
      syncComposer();
    }
  }

  function syncComposerFieldHeight() {
    if (!composerField) return;
    composerField.style.height = 'auto';
    composerField.style.height = `${composerField.scrollHeight}px`;
  }

  function syncComposer() {
    if (!composerField || !sendButton) return;
    composerField.value = draftValue;
    syncComposerFieldHeight();

    const iconEl = sendButton.querySelector('.chat-composer__send-icon');
    const labelEl = sendButton.querySelector('.chat-composer__send-label');

    if (isSending) {
      sendButton.disabled = false;
      sendButton.classList.add('chat-composer__send--stop');
      if (iconEl) iconEl.innerHTML = iconMarkup.stop;
      if (labelEl) {
        labelEl.textContent = strings.composer.stop;
        labelEl.hidden = false;
      }
    } else {
      sendButton.disabled = isEnhancing;
      sendButton.classList.remove('chat-composer__send--stop');
      if (iconEl) iconEl.innerHTML = iconMarkup.send;
      if (labelEl) {
        labelEl.textContent = '';
        labelEl.hidden = true;
      }
    }

    if (enhanceBtn) {
      const hasText = draftValue.trim().length > 0;
      enhanceBtn.disabled = !hasText || isSending || isEnhancing;
      enhanceBtn.classList.toggle('chat-composer__icon-button--active', isEnhancing);
    }

    if (modelButton) {
      modelButton.disabled = isEnhancing;
    }

    if (attachBtn) {
      attachBtn.disabled = isEnhancing;
    }

    if (terminalBtn) {
      terminalBtn.disabled = isEnhancing;
      terminalBtn.classList.toggle(
        'chat-composer__icon-button--active',
        terminalPanel?.isOpen() ?? false,
      );
    }

    if (composer) {
      composer.classList.toggle('chat-composer--enhancing', isEnhancing);
    }

    if (composerField) {
      composerField.disabled = isEnhancing;
    }
  }

  function focusComposer() {
    if (!composerField) return;
    composerField.focus();
    composerField.setSelectionRange(draftValue.length, draftValue.length);
  }

  function clearConversation() {
    generationToken += 1;
    messages = [];
    draftValue = '';
    pendingAttachments = [];
    isSending = false;
    sessionId = null;
    sessionCreatedAt = null;
    removeStreamListeners();
    closeSlashMenu();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      resetSpeakButton(activeSpeakBtn);
      activeSpeakBtn = null;
    }
    renderPendingAttachments();
    if (attachmentNotice) {
      attachmentNotice.hidden = true;
      attachmentNotice.textContent = '';
    }
    syncComposer();
    renderThread();
    focusComposer();
  }

  function renderTrack() {
    if (!track || !trackLabel || !thread || !scroll) return;

    const userMsgs = Array.from(thread.querySelectorAll('.chat-message--user'));
    const toShow = userMsgs;

    track.querySelectorAll('.chat-thread-track__dot').forEach((d) => d.remove());

    if (toShow.length < 2) {
      track.hidden = true;
      trackLabel.hidden = true;
      return;
    }

    track.hidden = false;
    const totalH = scroll.scrollHeight;

    for (const msgEl of toShow) {
      const dot = createElement('button', 'chat-thread-track__dot');
      dot.type = 'button';
      const pct = totalH > 0 ? (msgEl.offsetTop / totalH) * 100 : 0;
      dot.style.top = `${pct}%`;

      const preview = truncate(
        collapseWhitespace(msgEl.querySelector('.chat-message__bubble')?.textContent ?? ''),
        38,
      );

      dot.addEventListener('mouseenter', () => {
        trackLabel.textContent = preview;
        trackLabel.style.top = dot.style.top;
        trackLabel.hidden = false;
      });
      dot.addEventListener('mouseleave', () => {
        trackLabel.hidden = true;
      });
      dot.addEventListener('click', () => {
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgEl.classList.add('chat-message--highlighted');
        setTimeout(() => msgEl.classList.remove('chat-message--highlighted'), 1600);
      });

      track.append(dot);
    }

    updateTrackActive();
  }

  function updateTrackActive() {
    if (!track || !thread || !scroll) return;

    const dots = Array.from(track.querySelectorAll('.chat-thread-track__dot'));
    const userMsgs = Array.from(thread.querySelectorAll('.chat-message--user'));
    if (!dots.length) return;

    const scrollMid = scroll.scrollTop + scroll.clientHeight * 0.4;
    let activeIdx = 0;
    let minDist = Infinity;

    userMsgs.forEach((msgEl, i) => {
      const dist = Math.abs(msgEl.offsetTop - scrollMid);
      if (dist < minDist) {
        minDist = dist;
        activeIdx = i;
      }
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('chat-thread-track__dot--active', i === activeIdx);
    });
  }

  function renderThread() {
    if (!thread || !title || !composer || !scroll || !bottom) return;

    if (window.speechSynthesis && activeSpeakBtn) {
      window.speechSynthesis.cancel();
      resetSpeakButton(activeSpeakBtn);
      activeSpeakBtn = null;
    }

    const hasMessages = messages.length > 0;
    const isFirstMessage = hasMessages && !prevHasMessages;
    prevHasMessages = hasMessages;

    if (isFirstMessage) {
      // ── Sequential FLIP transition ──────────────────────────────────────────
      // Phase 1: pin welcome elements at their visual coords, swap the layout
      // class (fixed elements are immune to the reflow), then animate them out.
      // Phase 2: only after they’re fully gone, reveal and animate the thread in.
      // No overlap — no z-index battles, no bleed-through.

      const WELCOME_EXIT_MS = 220;
      const THREAD_ENTER_MS = 400;

      // 1. Capture visual positions before any change
      const titleRect = title.getBoundingClientRect();
      const bubblesRect = bubblesEl.getBoundingClientRect();

      // 2. Pin elements at their exact screen positions
      for (const [el, rect] of [
        [title, titleRect],
        [bubblesEl, bubblesRect],
      ]) {
        el.style.position = 'fixed';
        el.style.top = `${rect.top}px`;
        el.style.left = `${rect.left}px`;
        el.style.width = `${rect.width}px`;
        el.style.margin = '0';
        el.style.zIndex = '100';
      }

      // 3. Swap layout and composer state — fixed elements are unaffected
      scroll.classList.add('chat-stage__scroll--conversation');
      bottom.classList.add('chat-stage__bottom--conversation');
      composer.classList.add('chat-composer--conversation');
      composer.classList.add('chat-composer--entering');

      // 4. Start welcome exit on the next paint
      requestAnimationFrame(() => {
        title.classList.add('chat-stage__title--exiting');
        bubblesEl.classList.add('chat-prompt-bubbles--exiting');
      });

      // 5. Phase 2 — after welcome is fully gone, reveal and animate thread
      setTimeout(() => {
        for (const el of [title, bubblesEl]) {
          el.hidden = true;
          for (const prop of ['position', 'top', 'left', 'width', 'margin', 'zIndex']) {
            el.style[prop] = '';
          }
        }
        title.classList.remove('chat-stage__title--exiting');
        bubblesEl.classList.remove('chat-prompt-bubbles--exiting');

        thread.hidden = false;
        thread.classList.add('chat-thread--entering');

        // Stagger messages in after thread is visible
        requestAnimationFrame(() => {
          const msgEls = thread.querySelectorAll('.chat-message');
          msgEls.forEach((el, i) => {
            el.classList.add('chat-message--entering');
            el.style.setProperty('--msg-enter-delay', `${i * 55}ms`);
          });
        });
      }, WELCOME_EXIT_MS);

      // 6. Cleanup thread and composer animation classes
      setTimeout(() => {
        thread.classList.remove('chat-thread--entering');
        composer.classList.remove('chat-composer--entering');
      }, WELCOME_EXIT_MS + THREAD_ENTER_MS);
    } else {
      title.hidden = hasMessages;
      bubblesEl.hidden = hasMessages;
      thread.hidden = !hasMessages;
      composer.classList.toggle('chat-composer--conversation', hasMessages);
      scroll.classList.toggle('chat-stage__scroll--conversation', hasMessages);
      bottom.classList.toggle('chat-stage__bottom--conversation', hasMessages);
    }

    if (!hasMessages) {
      thread.replaceChildren();
      if (track) track.hidden = true;
      if (trackLabel) trackLabel.hidden = true;
      return;
    }

    const visibleMessages = messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => !message.hidden);

    // Group consecutive assistant messages so the entire tool-loop response
    // (think → call tool → think → answer) renders as one article with blocks
    // in the order they were generated, matching Claude.ai behaviour.
    const renderGroups = [];
    let assistantGroup = null;

    for (const item of visibleMessages) {
      if (item.message.role === 'assistant') {
        if (!assistantGroup) assistantGroup = [];
        assistantGroup.push(item);
      } else {
        if (assistantGroup) {
          renderGroups.push({ type: 'assistant', items: assistantGroup });
          assistantGroup = null;
        }
        renderGroups.push({ type: 'user', items: [item] });
      }
    }
    if (assistantGroup) renderGroups.push({ type: 'assistant', items: assistantGroup });

    thread.replaceChildren(
      ...renderGroups.map((group) => {
        if (group.type === 'user') {
          const { message, index } = group.items[0];
          const onCopy = () => navigator.clipboard.writeText(message.content ?? '').catch(() => {});
          const onRetry = () => {
            if (isSending) return;
            const userMessage = messages[index];
            if (!userMessage?.content) return;
            messages = messages.slice(0, index);
            draftValue = '';
            pendingAttachments = [];
            renderPendingAttachments();
            renderThread();
            void submitPrompt({
              content: userMessage.content,
              modelContent: userMessage.modelContent,
              attachments: userMessage.attachments ?? [],
              imageAttachments: userMessage.imageAttachments ?? [],
            });
          };
          return createMessageElement(message, strings, { onCopy, onRetry });
        }

        // Assistant group — find the preceding user message for retry
        const firstIndex = group.items[0].index;
        const lastMessage = group.items[group.items.length - 1].message;
        const onCopy = () =>
          navigator.clipboard.writeText(lastMessage.content ?? '').catch(() => {});
        const onRetry = () => {
          if (isSending) return;
          let userIndex = -1;
          for (let candidate = firstIndex - 1; candidate >= 0; candidate -= 1) {
            if (messages[candidate]?.role === 'user' && !messages[candidate]?.hidden) {
              userIndex = candidate;
              break;
            }
          }
          if (userIndex < 0) return;
          const userMessage = messages[userIndex];
          if (!userMessage?.content) return;
          messages = messages.slice(0, userIndex);
          draftValue = '';
          pendingAttachments = [];
          renderPendingAttachments();
          renderThread();
          void submitPrompt({
            content: userMessage.content,
            modelContent: userMessage.modelContent,
            attachments: userMessage.attachments ?? [],
            imageAttachments: userMessage.imageAttachments ?? [],
          });
        };

        return createAssistantGroupElement(group.items, strings, { onCopy, onRetry });
      }),
    );

    requestAnimationFrame(() => {
      if (!userScrolledUp) scroll.scrollTop = scroll.scrollHeight;
      renderTrack();
      if (isFirstMessage) {
        const msgEls = thread.querySelectorAll('.chat-message');
        msgEls.forEach((el, i) => {
          el.classList.add('chat-message--entering');
          el.style.setProperty('--msg-enter-delay', `${90 + i * 55}ms`);
        });
      }
    });
  }

  async function resolveTerminalCwd(requestedPath = '') {
    const explicitPath = String(requestedPath ?? '').trim();
    if (explicitPath) return explicitPath;

    const projectFolder = collapseWhitespace(activeProject?.folderPath ?? activeProject?.rootPath);
    if (projectFolder) return projectFolder;

    try {
      const result = await invokeIpc('terminal:get-default-cwd');
      return result?.ok ? result.cwd : '';
    } catch {
      return '';
    }
  }

  function resolveTerminalTimeout(payload = {}) {
    const seconds = Number(payload.timeout_seconds);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(Math.max(seconds * 1000, 1000), 300000);
    }

    return undefined;
  }

  async function executeTerminalTool(action) {
    const payload = action?.payload ?? {};

    if (action?.unsupported) {
      return { ok: false, error: strings.terminal.unsupportedTool };
    }

    if (action.tool === 'run_shell_command') {
      return invokeIpc('terminal:run-command', {
        command: payload.command,
        cwd: await resolveTerminalCwd(payload.working_directory ?? payload.cwd),
        timeout: resolveTerminalTimeout(payload),
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'assess_shell_command') {
      return invokeIpc('terminal:assess-command-risk', { command: payload.command });
    }

    if (action.tool === 'inspect_workspace') {
      return invokeIpc('terminal:inspect-workspace', {
        rootPath: await resolveTerminalCwd(payload.path ?? payload.working_directory),
      });
    }

    if (action.tool === 'search_workspace') {
      return invokeIpc('terminal:search-workspace', {
        rootPath: await resolveTerminalCwd(payload.path ?? payload.working_directory),
        query: payload.query,
        maxResults: payload.max_results,
      });
    }

    if (action.tool === 'read_local_file') {
      return invokeIpc('terminal:read-file', {
        filePath: payload.path,
        maxLines: payload.max_lines,
      });
    }

    if (action.tool === 'list_directory') {
      return invokeIpc('terminal:list-directory', {
        dirPath: payload.path || (await resolveTerminalCwd(payload.working_directory)),
      });
    }

    if (action.tool === 'git_status') {
      return invokeIpc('terminal:git-status', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      });
    }

    if (action.tool === 'git_diff') {
      return invokeIpc('terminal:git-diff', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        staged: payload.staged === true,
      });
    }

    if (action.tool === 'git_branches') {
      return invokeIpc('terminal:git-branches', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      });
    }

    if (action.tool === 'git_create_branch') {
      return invokeIpc('terminal:git-create-branch', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        branch: payload.branch,
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'git_checkout_branch') {
      return invokeIpc('terminal:git-checkout-branch', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        branch: payload.branch,
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'git_delete_branch') {
      return invokeIpc('terminal:git-delete-branch', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        branch: payload.branch,
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'git_pull') {
      return invokeIpc('terminal:git-pull', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'git_commit') {
      return invokeIpc('terminal:git-commit', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        message: payload.message,
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'git_push') {
      return invokeIpc('terminal:git-push', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'git_push_sync') {
      return invokeIpc('terminal:git-push-sync', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'run_project_checks') {
      return invokeIpc('terminal:run-project-checks', {
        workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
        includeLint: payload.include_lint !== false,
        includeTest: payload.include_test !== false,
        includeBuild: payload.include_build !== false,
      });
    }

    if (action.tool === 'start_local_server') {
      return invokeIpc('terminal:spawn-command', {
        command: payload.command,
        cwd: await resolveTerminalCwd(payload.working_directory ?? payload.cwd),
        allowRisky: payload.allow_risky === true,
      });
    }

    if (action.tool === 'read_terminal_output') {
      return invokeIpc(
        'terminal:read-output',
        payload.process_id ?? payload.processId ?? payload.pid,
      );
    }

    return { ok: false, error: strings.terminal.unsupportedTool };
  }

  function buildSubAgentTaskPrompt(task, coordinationGoal, index, total) {
    return payload.subAgentPrompt
      .replace('{index}', String(index + 1))
      .replace('{total}', String(total))
      .replace('{coordinationGoal}', coordinationGoal ? `Team objective: ${coordinationGoal}` : '')
      .replace('{title}', task.title)
      .replace('{goal}', task.goal)
      .replace('{context}', task.context ? `Extra context:\n${task.context}` : '')
      .replace('{deliverable}', task.deliverable ? `Expected handoff:\n${task.deliverable}` : '')
      .split('\n')
      .filter((line) => line.trim())
      .join('\n');
  }

  function getSubAgentConversationContext() {
    return messages
      .filter(
        (message) => !message.hidden && !message.streaming && !message.pending && message.content,
      )
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.modelContent || message.content,
      }));
  }

  function formatSubAgentOutput(tasks, results, coordinationGoal) {
    const lines = [strings.tools.subAgentsResultHeader];

    if (coordinationGoal) {
      lines.push(
        '',
        formatText(strings.tools.subAgentsCoordinationGoal, { goal: coordinationGoal }),
      );
    }

    tasks.forEach((task, index) => {
      const result = results[index] ?? {};
      lines.push(
        '',
        formatText(strings.tools.subAgentsTaskHeader, {
          index: String(index + 1),
          title: task.title,
        }),
        formatText(strings.tools.subAgentsGoal, { goal: task.goal }),
      );

      if (task.deliverable) {
        lines.push(
          formatText(strings.tools.subAgentsDeliverable, { deliverable: task.deliverable }),
        );
      }

      if (result.ok) {
        lines.push('', `${strings.tools.subAgentsHandoff}:\n${result.text}`);
      } else {
        lines.push('', `${strings.tools.subAgentsError}:\n${result.error}`);
      }
    });

    return lines.join('\n');
  }

  async function runSubAgentConversation({ conversationContext, prompt, memoryContext }) {
    const localMessages = [
      ...conversationContext,
      {
        role: 'user',
        content: prompt,
      },
    ];
    const toolsetTools = await loadToolsetPrompt();
    let usage = { input: 0, output: 0 };
    let lastMeta = {};
    const MAX_SUB_AGENT_TOOL_CALLS = 10;

    for (let depth = 0; depth <= MAX_SUB_AGENT_TOOL_CALLS; depth += 1) {
      const result = await invokeIpc('chat:complete-message', {
        messages: localMessages,
        providerId: activeProvider?.id ?? null,
        modelId: activeModel?.id ?? null,
        memoryContext: memoryContext || null,
        projectInfo: buildProjectContext(activeProject) || null,
        persona: (getActivePersona?.() ?? activePersona)?.content || null,
        modeInstruction: getModeInstruction(),
        terminalTools: payload.terminalPrompt,
        toolsetTools: toolsetTools || null,
        isNewSession: false,
      });

      usage = {
        input: usage.input + (result?.charCountIn ?? 0),
        output: usage.output + (result?.charCountOut ?? 0),
      };
      lastMeta = result ?? {};

      const { content: parsedContent } = parseThinkingFromText(String(result?.text ?? ''));
      const terminalAction = parseTerminalToolRequest(parsedContent);
      const toolsetAction = terminalAction ? null : parseToolsetToolRequest(parsedContent);

      if (!terminalAction && !toolsetAction) {
        return {
          ...lastMeta,
          text: parsedContent || strings.composer.emptyResponse,
          charCountIn: usage.input,
          charCountOut: usage.output,
        };
      }

      if (depth >= MAX_SUB_AGENT_TOOL_CALLS) {
        return {
          ...lastMeta,
          text: stripNativeToolCalls(parsedContent) || strings.terminal.unsupportedTool,
          charCountIn: usage.input,
          charCountOut: usage.output,
        };
      }

      let modelResult;

      if (terminalAction) {
        const terminalResult = await executeTerminalTool(terminalAction).catch((error) => ({
          ok: false,
          error: error?.message ?? String(error),
        }));
        modelResult = formatTerminalResultForModel(strings, terminalAction, terminalResult);
        if (!terminalResult?.ok && terminalResult?.error) {
          modelResult +=
            '\n\nThe tool failed. Diagnose the error, then retry with a corrected approach or use an alternative method to accomplish the same goal.';
        }
        localMessages.push({
          role: 'assistant',
          content:
            stripNativeToolCalls(terminalAction.visibleContent) || strings.terminal.runningTool,
        });
      } else {
        const toolsetResult =
          toolsetAction.tool === 'spawn_sub_agents'
            ? {
                ok: false,
                tool: toolsetAction.tool,
                error: 'Nested sub-agents are not available inside a sub-agent task.',
              }
            : await executeToolsetTool(toolsetAction).catch((error) => ({
                ok: false,
                tool: toolsetAction.tool,
                error: error?.message ?? String(error),
              }));
        modelResult = formatToolsetResultForModel(toolsetAction, toolsetResult);
        if (!toolsetResult?.ok && toolsetResult?.error) {
          modelResult +=
            '\n\nThe tool failed. Diagnose the error, then retry with a corrected approach or use an alternative method to accomplish the same goal.';
        }
        localMessages.push({
          role: 'assistant',
          content: stripNativeToolCalls(toolsetAction.visibleContent) || strings.tools.runningTool,
        });
      }

      localMessages.push({
        role: 'user',
        content: modelResult,
      });
    }

    return {
      text: strings.composer.emptyResponse,
      charCountIn: usage.input,
      charCountOut: usage.output,
      providerLabel: lastMeta.providerLabel ?? '',
      modelLabel: lastMeta.modelLabel ?? '',
    };
  }

  async function executeSubAgentTool(action, onProgress) {
    const payload = action?.payload ?? {};
    const tasks = normalizeSubAgentTasks(payload.parameters?.tasks ?? payload.tasks);

    if (!tasks.length) {
      return {
        ok: false,
        tool: action.tool,
        error: strings.tools.subAgentsNoTasks,
      };
    }

    const coordinationGoal = collapseWhitespace(
      payload.parameters?.coordination_goal ??
        payload.coordination_goal ??
        strings.tools.subAgentFallbackGoal,
    );
    const conversationContext = getSubAgentConversationContext();
    const memoryContext = await loadMemoryContext();

    const results = await Promise.all(
      tasks.map(async (task, index) => {
        const prompt = buildSubAgentTaskPrompt(task, coordinationGoal, index, tasks.length);
        onProgress?.(index, { status: 'running', prompt });

        try {
          const result = await runSubAgentConversation({
            conversationContext,
            prompt,
            memoryContext,
          });

          const agentResult = {
            ok: true,
            text: String(result?.text ?? '').trim() || strings.composer.emptyResponse,
            usage: {
              input: result?.charCountIn ?? 0,
              output: result?.charCountOut ?? 0,
            },
            providerLabel: result?.providerLabel ?? '',
            modelLabel: result?.modelLabel ?? '',
          };
          onProgress?.(index, { status: 'completed', output: agentResult.text });
          return agentResult;
        } catch (error) {
          const agentResult = { ok: false, error: error?.message ?? String(error) };
          onProgress?.(index, { status: 'failed', error: agentResult.error });
          return agentResult;
        }
      }),
    );

    return {
      ok: results.some((result) => result.ok),
      tool: action.tool,
      output: formatSubAgentOutput(tasks, results, coordinationGoal),
      results,
    };
  }

  async function executeToolsetTool(action) {
    if (action?.tool === 'spawn_sub_agents') {
      return executeSubAgentTool(action);
    }

    const payload = action?.payload ?? {};
    return invokeIpc('toolset:execute-tool', {
      tool: action.tool,
      parameters: payload.parameters ?? {},
    });
  }

  function formatToolsetResultForModel(action, result) {
    const lines = ['Built-in tool result', `Tool: ${action.tool}`];

    if (result?.output) lines.push(`Output:\n${result.output}`);
    if (result?.error) lines.push(`Error:\n${result.error}`);
    if (!result?.output && !result?.error) lines.push(JSON.stringify(result ?? {}, null, 2));
    return lines.join('\n\n');
  }

  function updateLastAssistantMessage(updater) {
    messages = messages.map((message, index) =>
      index !== messages.length - 1 ? message : updater(message),
    );
  }

  function buildTerminalDisplayOutput(result) {
    const parts = [];
    if (result?.stdout) parts.push(result.stdout);
    if (result?.stderr) parts.push(result.stderr);
    if (result?.error) parts.push(result.error);
    if (result?.summary) parts.push(JSON.stringify(result.summary, null, 2));
    if (result?.hint) parts.push(result.hint);
    if (result?.category) parts.push(`Category: ${result.category}`);
    if (result?.current || Array.isArray(result?.branches)) {
      parts.push(
        [
          result.current ? `Current branch: ${result.current}` : '',
          Array.isArray(result.branches) ? `Branches:\n${result.branches.join('\n')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
    if (Array.isArray(result?.matches)) parts.push(JSON.stringify(result.matches, null, 2));
    if (Array.isArray(result?.entries)) parts.push(JSON.stringify(result.entries, null, 2));
    if (result?.content) parts.push(result.content);
    if (result?.processId) parts.push(`Process id: ${result.processId}`);
    if (result?.buffer) parts.push(result.buffer);
    return parts.join('\n\n').trim();
  }

  async function continueAfterTerminalTool(action, terminalDepth, runToken, generationStartTime) {
    let result;

    try {
      result = await executeTerminalTool(action);
    } catch (error) {
      result = { ok: false, error: error?.message ?? String(error) };
    }

    if (runToken !== generationToken) return;

    const isBlocked = Boolean(result?.risk?.blocked);
    const ok = result?.ok !== false && !result?.error;
    const isRunningProcess = ok && result?.running === true && result?.processId;
    const status = isBlocked
      ? 'blocked'
      : isRunningProcess
        ? 'running'
        : ok
          ? 'completed'
          : 'failed';
    const statusLabel = isBlocked
      ? strings.terminal.blockedTool
      : isRunningProcess
        ? strings.terminal.running
        : ok
          ? strings.terminal.completedTool
          : strings.terminal.failedTool;
    const modelResult = formatTerminalResultForModel(strings, action, result);

    updateLastAssistantMessage((message) => ({
      ...message,
      terminal: {
        ...(message.terminal ?? {}),
        status,
        statusLabel,
        processId: result?.processId ?? message.terminal?.processId ?? null,
        output: buildTerminalDisplayOutput(result),
        exitCode: result?.exitCode,
      },
    }));

    messages = [
      ...messages,
      {
        role: 'user',
        content: strings.terminal.hiddenResultLabel,
        modelContent: modelResult,
        hidden: true,
      },
      {
        role: 'assistant',
        content: '',
        thinking: '',
        streaming: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel,
      },
    ];

    accText = '';
    accThinking = '';
    syncComposer();
    renderThread();

    await startAssistantStream({
      isNewSession: false,
      terminalDepth: terminalDepth + 1,
      runToken,
      generationStartTime,
    });
  }

  async function continueAfterToolsetTool(action, terminalDepth, runToken, generationStartTime) {
    // ── Sub-agents: special-cased for live per-task progress ─────────────────
    if (action.tool === 'spawn_sub_agents') {
      const initTasks = normalizeSubAgentTasks(
        action.payload?.parameters?.tasks ?? action.payload?.tasks,
      );
      let currentSubAgents = initTasks.map((task) => ({
        title: task.title,
        goal: task.goal,
        prompt: '',
        status: 'queued',
        output: '',
        error: '',
      }));

      updateLastAssistantMessage((message) => ({
        ...message,
        terminal: {
          ...(message.terminal ?? {}),
          status: 'running',
          statusLabel: strings.tools.subAgentsRunning,
          subAgents: currentSubAgents,
        },
      }));
      syncComposer();
      renderThread();

      const onProgress = (index, agentState) => {
        if (runToken !== generationToken) return;
        currentSubAgents = currentSubAgents.map((a, i) =>
          i === index ? { ...a, ...agentState } : a,
        );
        updateSubAgentCard(thread, currentSubAgents, strings);
      };

      let subAgentResult;
      try {
        subAgentResult = await executeSubAgentTool(action, onProgress);
      } catch (error) {
        subAgentResult = { ok: false, error: error?.message ?? String(error), tool: action.tool };
      }

      if (runToken !== generationToken) return;

      if (Array.isArray(subAgentResult?.results)) {
        subAgentResult.results.forEach((agentResult, i) => {
          currentSubAgents = currentSubAgents.map((a, idx) => {
            if (idx !== i) return a;
            return agentResult.ok
              ? { ...a, status: 'completed', output: agentResult.text ?? '' }
              : { ...a, status: 'failed', error: agentResult.error ?? '' };
          });
        });
      }

      const subAgentOk = subAgentResult?.ok !== false && !subAgentResult?.error;
      const subAgentModelResult = formatToolsetResultForModel(action, subAgentResult);

      updateLastAssistantMessage((message) => ({
        ...message,
        terminal: {
          ...(message.terminal ?? {}),
          status: subAgentOk ? 'completed' : 'failed',
          statusLabel: subAgentOk ? strings.tools.subAgentsComplete : strings.tools.subAgentsFailed,
          output: subAgentResult?.output ?? subAgentResult?.error ?? '',
          subAgents: currentSubAgents,
        },
      }));

      messages = [
        ...messages,
        {
          role: 'user',
          content: strings.tools.hiddenResultLabel,
          modelContent: subAgentModelResult,
          hidden: true,
        },
        {
          role: 'assistant',
          content: '',
          thinking: '',
          streaming: true,
          providerLabel: activeProvider?.label ?? 'AI',
          modelLabel: activeModelLabel,
        },
      ];

      accText = '';
      accThinking = '';
      syncComposer();
      renderThread();

      await startAssistantStream({
        isNewSession: false,
        terminalDepth: terminalDepth + 1,
        runToken,
        generationStartTime,
      });
      return;
    }

    // ── All other toolset tools ───────────────────────────────────────────────
    let result;

    try {
      result = await executeToolsetTool(action);
    } catch (error) {
      result = { ok: false, error: error?.message ?? String(error), tool: action.tool };
    }

    if (runToken !== generationToken) return;

    const ok = result?.ok !== false && !result?.error;
    const modelResult = formatToolsetResultForModel(action, result);

    updateLastAssistantMessage((message) => ({
      ...message,
      terminal: {
        ...(message.terminal ?? {}),
        status: ok ? 'completed' : 'failed',
        statusLabel: ok ? strings.tools.completedTool : strings.tools.failedTool,
        output: result?.output ?? result?.error ?? '',
      },
    }));

    messages = [
      ...messages,
      {
        role: 'user',
        content: strings.tools.hiddenResultLabel,
        modelContent: modelResult,
        hidden: true,
      },
      {
        role: 'assistant',
        content: '',
        thinking: '',
        streaming: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel,
      },
    ];

    accText = '';
    accThinking = '';
    syncComposer();
    renderThread();

    await startAssistantStream({
      isNewSession: false,
      terminalDepth: terminalDepth + 1,
      runToken,
      generationStartTime,
    });
  }

  async function startAssistantStream({
    isNewSession,
    terminalDepth = 0,
    runToken,
    generationStartTime,
  }) {
    removeStreamListeners();

    // Start the diagnostic timer only on the first turn (not tool continuations).
    // If the model hasn't sent a single token after 10 seconds, show the panel
    // and run internet + provider reachability checks in parallel.
    if (terminalDepth === 0) {
      clearTimeout(diagTimer);
      diagTimer = setTimeout(async () => {
        if (runToken !== generationToken) return;

        diagPanel.show(thread);
        diagPanel.addItem(strings.diag.slowResponse);

        const userProviderDetails = payload.user?.providers?.details ?? {};

        // Run internet and provider checks concurrently so results appear as
        // they finish rather than sequentially.
        const netRef = diagPanel.addItem(strings.diag.checkingInternet, 'spin');
        const provLabel = activeProvider?.label ?? 'AI provider';
        const provBaseUrl = activeProvider
          ? resolveProviderBaseUrl(activeProvider, userProviderDetails)
          : null;
        const provRef = diagPanel.addItem(
          strings.diag.checkingProvider.replace('AI provider', provLabel),
          'spin',
        );

        const [netResult, provResult] = await Promise.all([
          measureFetch('https://dns.google/resolve?name=google.com&type=A'),
          provBaseUrl ? measureFetch(provBaseUrl) : Promise.resolve(null),
        ]);

        if (runToken !== generationToken) return;

        if (netResult.ok) {
          netRef.update(`${strings.diag.internetStable} (${netResult.ms}ms)`);
        } else {
          netRef.update(strings.diag.internetUnreachable, 'error');
        }

        if (provResult === null) {
          provRef.update(strings.diag.providerNoEndpoint, 'warn');
        } else if (provResult.ok) {
          provRef.update(`${provLabel}: Reachable (${provResult.ms}ms)`);
          diagPanel.addItem(strings.diag.providerSlow);
        } else {
          provRef.update(`${provLabel}: Unreachable`, 'error');
          diagPanel.addItem(strings.diag.checkSettings, 'warn');
        }
      }, 10_000);
    }

    streamDisposers.push(
      onIpc('chat:stream-chunk', (chunk) => {
        if (runToken !== generationToken) return;
        if (chunk?.type === 'text' && chunk.text) accText += chunk.text;
        if (chunk?.type === 'thinking' && chunk.text) accThinking += chunk.text;
        const { content: displayContent, thinking: inlineThinking } =
          parseThinkingFromText(accText);
        const displayThinking = accThinking || inlineThinking;
        updateLastStreamingMessage(thread, { content: displayContent, thinking: displayThinking });
        scheduleScrollToBottom();
      }),
    );

    streamDisposers.push(
      onIpc('chat:stream-done', (meta) => {
        if (runToken !== generationToken) return;
        clearTimeout(diagTimer);
        diagTimer = null;
        diagPanel?.hide();
        removeStreamListeners();
        const { content: parsedContent, thinking: inlineThinking } = parseThinkingFromText(accText);
        const terminalAction = parseTerminalToolRequest(parsedContent);
        const toolsetAction = terminalAction ? null : parseToolsetToolRequest(parsedContent);

        if ((terminalAction || toolsetAction) && terminalDepth >= MAX_TERMINAL_TOOL_CALLS) {
          const action = terminalAction || toolsetAction;
          updateLastAssistantMessage((message) => ({
            ...message,
            role: 'assistant',
            content: action.visibleContent || strings.terminal.unsupportedTool,
            thinking: accThinking || inlineThinking,
            streaming: false,
            error: true,
            providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
            modelLabel: meta?.modelLabel ?? activeModelLabel,
          }));
          isSending = false;
          void saveCurrentSession();
          void playCompletionSound(generationStartTime);
          syncComposer();
          renderThread();
          return;
        }

        if (terminalAction) {
          const label = getTerminalToolLabel(strings, terminalAction.tool);
          updateLastAssistantMessage((message) => ({
            ...message,
            role: 'assistant',
            content:
              stripNativeToolCalls(terminalAction.visibleContent) || strings.terminal.runningTool,
            thinking: accThinking || inlineThinking,
            streaming: false,
            providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
            modelLabel: meta?.modelLabel ?? activeModelLabel,
            terminal: {
              label,
              command: getTerminalActionSummary(terminalAction, strings),
              status: terminalAction.unsupported ? 'failed' : 'running',
              statusLabel: terminalAction.unsupported
                ? strings.terminal.unsupportedTool
                : strings.terminal.running,
            },
          }));
          syncComposer();
          renderThread();

          if (terminalAction.unsupported) {
            isSending = false;
            void saveCurrentSession();
            void playCompletionSound(generationStartTime);
            syncComposer();
            return;
          }

          void continueAfterTerminalTool(
            terminalAction,
            terminalDepth,
            runToken,
            generationStartTime,
          );
          return;
        }

        if (toolsetAction) {
          const isSubAgentAction = toolsetAction.tool === 'spawn_sub_agents';
          updateLastAssistantMessage((message) => ({
            ...message,
            role: 'assistant',
            content:
              stripNativeToolCalls(toolsetAction.visibleContent) ||
              (isSubAgentAction ? strings.tools.subAgentsRunning : strings.tools.runningTool),
            thinking: accThinking || inlineThinking,
            streaming: false,
            providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
            modelLabel: meta?.modelLabel ?? activeModelLabel,
            terminal: {
              label: isSubAgentAction ? strings.tools.subAgentsLabel : toolsetAction.tool,
              command: toolsetAction.tool,
              status: 'running',
              statusLabel: strings.terminal.running,
            },
          }));
          syncComposer();
          renderThread();
          void continueAfterToolsetTool(
            toolsetAction,
            terminalDepth,
            runToken,
            generationStartTime,
          );
          return;
        }

        const isEmpty = !parsedContent && !accThinking;
        updateLastAssistantMessage(() => ({
          role: 'assistant',
          content: parsedContent || strings.composer.emptyResponse,
          thinking: accThinking || inlineThinking,
          streaming: false,
          empty: isEmpty,
          durationMs: Date.now() - generationStartTime,
          providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
          modelLabel: meta?.modelLabel ?? activeModelLabel,
        }));
        isSending = false;
        void saveCurrentSession();
        void playCompletionSound(generationStartTime);
        syncComposer();
        renderThread();
      }),
    );

    streamDisposers.push(
      onIpc('chat:stream-error', (error) => {
        if (runToken !== generationToken) return;
        clearTimeout(diagTimer);
        diagTimer = null;
        diagPanel?.hide();
        removeStreamListeners();
        updateLastAssistantMessage(() => ({
          role: 'assistant',
          content: error?.message || strings.composer.responseError,
          thinking: accThinking,
          streaming: false,
          error: true,
          providerLabel: activeProvider?.label ?? 'AI',
          modelLabel: activeModelLabel,
        }));
        isSending = false;
        syncComposer();
        renderThread();
      }),
    );

    const historyToSend = messages
      .slice(0, -1)
      .filter(({ error, stopped, empty }) => !error && !stopped && !empty)
      .map(({ role, content, modelContent, imageAttachments }) => {
        if (role !== 'user') return { role, content };
        const textContent = modelContent || content;
        // Carry image data so providers can build multimodal content blocks.
        if (!imageAttachments?.length) return { role, content: textContent };
        return { role, content: textContent, imageAttachments };
      });
    const [memoryContext, toolsetTools] = await Promise.all([
      loadMemoryContext(),
      loadToolsetPrompt(),
    ]);

    if (runToken !== generationToken) return;

    void invokeIpc('chat:stream-message', {
      messages: historyToSend,
      providerId: activeProvider?.id ?? null,
      modelId: activeModel?.id ?? null,
      memoryContext: memoryContext || null,
      projectInfo: buildProjectContext(activeProject) || null,
      persona: (getActivePersona?.() ?? activePersona)?.content || null,
      modeInstruction: getModeInstruction(),
      terminalTools: strings.terminal.systemPrompt,
      toolsetTools: toolsetTools || null,
      isNewSession,
    });
  }

  async function submitPrompt(resend = null) {
    const isResend = resend !== null;

    // Display summaries shown in the thread (no base64 — safe to store in session).
    // Exception: image attachments keep mimeType + base64 in-memory so the thread
    // can render thumbnails. saveCurrentSession() strips them via toAttachmentSummary.
    const allDisplayAttachments = isResend
      ? (resend.attachments ?? [])
      : pendingAttachments.map((a) =>
          a.kind === 'image'
            ? { ...toAttachmentSummary(a), mimeType: a.mimeType, base64: a.base64 }
            : toAttachmentSummary(a),
        );

    // Text-only attachments used to build the model context block.
    const textAttachments = isResend
      ? allDisplayAttachments.filter((a) => a.kind !== 'image')
      : pendingAttachments.filter((a) => a.kind !== 'image');

    // Image attachments with base64 for the API.  Never persisted to disk.
    const imageAttachmentsData = isResend
      ? (resend.imageAttachments ?? [])
      : pendingAttachments
          .filter((a) => a.kind === 'image')
          .map((a) => ({ mimeType: a.mimeType, base64: a.base64 }));

    const prompt =
      String(resend?.content ?? draftValue).trim() ||
      (allDisplayAttachments.length ? strings.composer.attachmentOnlyPrompt : '');

    if ((!prompt && allDisplayAttachments.length === 0) || isSending) return;

    const isNewSession = !sessionId;
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionCreatedAt = new Date().toISOString();
    }

    const modelContent =
      resend?.modelContent || buildModelContent(strings, prompt, textAttachments);

    messages = [
      ...messages,
      {
        role: 'user',
        content: prompt,
        modelContent,
        attachments: allDisplayAttachments,
        imageAttachments: imageAttachmentsData,
      },
      {
        role: 'assistant',
        content: '',
        thinking: '',
        streaming: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel,
      },
    ];

    draftValue = '';
    pendingAttachments = [];
    isSending = true;
    accText = '';
    accThinking = '';
    userScrolledUp = false;
    const generationStartTime = Date.now();
    const runToken = ++generationToken;
    closeSlashMenu();
    renderPendingAttachments();
    syncComposer();
    renderThread();
    focusComposer();
    await startAssistantStream({
      isNewSession,
      terminalDepth: 0,
      runToken,
      generationStartTime,
    });
  }

  scroll = createElement('div', 'chat-stage__scroll');
  bottom = createElement('div', 'chat-stage__bottom');
  const rawGreeting = isBirthday
    ? getBirthdayGreeting(firstName)
    : isChristmas
      ? getChristmasGreeting(firstName)
      : isNewYear
        ? getNewYearGreeting(firstName)
        : greetings[Math.floor(Math.random() * greetings.length)];
  const greeting = rawGreeting.replace(/\s(\S+\s*)$/, '\u00A0$1');
  title = createElement('h1', 'chat-stage__title', greeting);
  thread = createElement('section', 'chat-thread');
  thread.hidden = true;

  // ── Prompt bubbles ──────────────────────────────────────────────────────
  bubblesEl = createElement('div', 'chat-prompt-bubbles');
  for (const { icon, label, prompt, submit } of getRandomSuggestions()) {
    const btn = createElement('button', 'chat-prompt-bubble');
    btn.type = 'button';
    btn.append(
      createIcon(icon, 'chat-prompt-bubble__icon'),
      createElement('span', 'chat-prompt-bubble__label', label),
    );
    btn.addEventListener('click', () => {
      setDraftValue(prompt);
      if (submit) void submitPrompt();
      else focusComposer();
    });
    bubblesEl.append(btn);
  }

  composer = createElement('section', 'chat-composer');
  projectPill = createElement('div', 'chat-composer__project');
  projectPill.hidden = true;
  const projectIconEl = createElement('span', 'chat-composer__project-icon');
  projectIconEl.append(createIcon('tabProjects', 'chat-composer__project-icon-glyph'));
  const projectBodyEl = createElement('div', 'chat-composer__project-body');
  projectNameEl = createElement('div', 'chat-composer__project-name');
  projectMetaEl = createElement('div', 'chat-composer__project-meta');
  projectBodyEl.append(projectNameEl, projectMetaEl);
  const projectClearBtn = createElement('button', 'chat-composer__project-clear');
  projectClearBtn.type = 'button';
  projectClearBtn.setAttribute('aria-label', strings.projects.removeActive);
  projectClearBtn.append(createIcon('close', 'chat-composer__project-clear-icon'));
  projectClearBtn.addEventListener('click', () => {
    clearActiveProject();
    focusComposer();
  });
  projectPill.append(projectIconEl, projectBodyEl, projectClearBtn);

  gitBarEl = createElement('div', 'chat-gitbar');
  gitBarEl.hidden = true;
  const gitIdentity = createElement('div', 'chat-gitbar__identity');
  gitStatusDotEl = createElement('span', 'chat-gitbar__dot');
  const gitCopy = createElement('div', 'chat-gitbar__copy');
  gitBranchEl = createElement('div', 'chat-gitbar__branch');
  gitMetaEl = createElement('div', 'chat-gitbar__meta');
  gitCopy.append(gitBranchEl, gitMetaEl);
  gitIdentity.append(gitStatusDotEl, createIcon('github', 'chat-gitbar__icon'), gitCopy);

  const gitActions = createElement('div', 'chat-gitbar__actions');
  gitRefreshBtn = createElement('button', 'chat-gitbar__icon-button');
  gitRefreshBtn.type = 'button';
  gitRefreshBtn.setAttribute('aria-label', strings.git.refresh);
  gitRefreshBtn.append(createIcon('retry', 'chat-gitbar__button-icon'));
  gitRefreshBtn.addEventListener('click', () => {
    void refreshProjectGitStatus();
  });

  gitSecondaryBtn = createElement('button', 'chat-gitbar__secondary');
  gitSecondaryBtn.type = 'button';
  gitSecondaryBtn.addEventListener('click', () => {
    void runGitBarAction(gitSecondaryBtn._gitAction);
  });

  gitPrimaryBtn = createElement('button', 'chat-gitbar__primary');
  gitPrimaryBtn.type = 'button';
  gitPrimaryBtn.addEventListener('click', () => {
    void runGitBarAction(gitPrimaryBtn._gitAction);
  });

  gitActions.append(gitRefreshBtn, gitSecondaryBtn, gitPrimaryBtn);
  gitBarEl.append(gitIdentity, gitActions);

  composerField = document.createElement('textarea');
  composerField.className = 'chat-composer__field';
  composerField.placeholder = strings.composer.placeholder;
  composerField.rows = 1;
  composerField.addEventListener('input', (event) => {
    draftValue = event.target.value;
    syncComposerFieldHeight();
    syncComposer();
    void updateSlashMenu();
  });
  composerField.addEventListener('keydown', (event) => {
    if (handleSlashKeydown(event)) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitPrompt();
    }
  });

  const composerFooter = createElement('div', 'chat-composer__footer');
  const composerActions = createElement('div', 'chat-composer__actions');
  attachBtn = createElement('button', 'chat-composer__icon-button');
  attachBtn.type = 'button';
  attachBtn.setAttribute('aria-label', strings.composer.attachFiles);
  attachBtn.append(createIcon('paperclip', 'chat-composer__icon'));
  attachBtn.addEventListener('click', () => {
    void selectAttachments();
  });

  enhanceBtn = createElement('button', 'chat-composer__icon-button');
  enhanceBtn.type = 'button';
  enhanceBtn.setAttribute('aria-label', strings.composer.enhancePrompt);
  enhanceBtn.append(createIcon('aiSparkle', 'chat-composer__icon'));
  enhanceBtn.addEventListener('click', () => {
    void enhancePrompt();
  });

  terminalBtn = createElement('button', 'chat-composer__icon-button');
  terminalBtn.type = 'button';
  terminalBtn.setAttribute('aria-label', strings.composer.openTerminal);
  terminalBtn.append(createIcon('terminal', 'chat-composer__icon'));
  terminalBtn.addEventListener('click', () => {
    terminalPanel?.toggle();
  });

  composerActions.append(attachBtn, enhanceBtn, terminalBtn);

  const composerSubmit = createElement('div', 'chat-composer__submit');
  modelButton = createElement('button', 'chat-composer__model');
  modelButton.type = 'button';
  modelButton.append(
    createElement('span', 'chat-composer__model-label', activeModelLabel),
    createIcon('chevronDown', 'chat-composer__model-icon'),
  );
  modelButton.addEventListener('click', (event) => {
    event.stopPropagation();
    openModelPicker(modelButton);
  });

  sendButton = createElement('button', 'chat-composer__send');
  sendButton.type = 'button';
  const sendLabel = createElement('span', 'chat-composer__send-label');
  sendLabel.hidden = true;
  sendButton.append(createIcon('send', 'chat-composer__send-icon'), sendLabel);
  sendButton.addEventListener('click', () => {
    if (isSending) {
      stopStream();
    } else {
      void submitPrompt();
    }
  });

  composerSubmit.append(modelButton, sendButton);
  composerFooter.append(composerActions, composerSubmit);
  attachmentsEl = createElement('div', 'chat-composer__attachments');
  attachmentsEl.hidden = true;
  attachmentNotice = createElement('div', 'chat-composer__notice');
  attachmentNotice.hidden = true;
  slashMenu = createElement('div', 'chat-slash-menu');
  slashMenu.hidden = true;
  slashMenu.setAttribute('role', 'listbox');
  slashMenu.setAttribute('aria-label', strings.slash.label);
  slashScroller = createElement('div', 'chat-slash-menu__scroller');
  slashMenu.append(slashScroller);
  attachCustomScrollbar(slashMenu, slashScroller, { top: 6, bottom: 6, right: 4, minThumb: 24 });
  diagPanel = createDiagnosticPanel(strings);
  composer.append(
    projectPill,
    gitBarEl,
    attachmentsEl,
    attachmentNotice,
    composerField,
    composerFooter,
    slashMenu,
  );
  scroll.append(title, bubblesEl, thread);
  scrollToBottomBtn = createElement('button', 'chat-scroll-to-bottom-btn');
  scrollToBottomBtn.type = 'button';
  scrollToBottomBtn.setAttribute('aria-label', strings.composer.scrollToBottom);
  scrollToBottomBtn.append(createIcon('chevronDown', 'chat-scroll-to-bottom-btn__icon'));
  scrollToBottomBtn.addEventListener('click', () => {
    userScrolledUp = false;
    if (scroll) scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' });
    syncScrollToBottomBtn();
  });
  bottom.append(scrollToBottomBtn, composer);
  const browserPreview = createBrowserPreviewPanel(strings.browserPreview, {
    onVisibilityChange: (visible) => {
      view.classList.toggle('chat-view--browser-preview', visible);
    },
  });
  terminalPanel = createChatTerminalPanel(strings, {
    onOpenChange: (open) => {
      view.classList.toggle('chat-view--terminal', open);
      syncComposer();
    },
  });
  const privateBtn = createElement('button', 'chat-private-btn');
  privateBtn.type = 'button';
  privateBtn.setAttribute('aria-label', 'Toggle private chat');
  privateBtn.append(
    createIcon('lock', 'chat-private-btn__icon'),
    createElement('span', 'chat-private-btn__label', 'Private'),
  );
  const originalGreeting = greeting;
  privateBtn.addEventListener('click', () => {
    isPrivate = !isPrivate;
    privateBtn.classList.toggle('chat-private-btn--active', isPrivate);
    if (title && messages.length === 0) {
      if (isPrivate) {
        title.textContent = getPrivateGreeting(firstName).replace(/\s(\S+\s*)$/, '\u00A0$1');
      } else {
        title.textContent = originalGreeting;
      }
    }
  });
  view.append(scroll, bottom, browserPreview.element, terminalPanel.build(), privateBtn);
  track = createElement('div', 'chat-thread-track');
  track.hidden = true;
  trackLabel = createElement('div', 'chat-thread-track__label');
  trackLabel.hidden = true;
  track.append(trackLabel);
  view.append(track);
  scroll.addEventListener('scroll', () => updateTrackActive(), { passive: true });
  scroll.addEventListener(
    'scroll',
    () => {
      userScrolledUp = !isNearBottom();
      syncScrollToBottomBtn();
    },
    { passive: true },
  );
  browserPreview.start();
  wireTerminalProcessCards();

  applyActiveProject(activeProject);
  syncComposer();
  renderThread();

  // ── React to default-model changes made in App Settings ──────────────────
  // When the user saves a new default model, update the active provider/model
  // and the composer button label so the UI stays in sync without requiring a
  // full reload. Only applies when the user has not manually picked a different
  // model in the current session (tracked via the userOverrodeModel flag).
  let userOverrodeModel = Boolean(appSettings?.defaultModel);

  function applyDefaultModelFromSettings(settings) {
    const dm = settings?.defaultModel;
    const dmProvider = dm?.providerId
      ? (payload.providers.find((p) => p.id === dm.providerId) ?? null)
      : null;
    const dmModel = dmProvider?.models?.find((m) => m.id === dm?.modelId) ?? null;

    if (dmProvider && dmModel) {
      activeProvider = dmProvider;
      activeModel = dmModel;
      activeModelLabel = dmModel.name ?? dmModel.id;
    } else {
      // Default model was cleared or is no longer available — fall back.
      activeProvider = getPreferredProvider(payload);
      activeModel = activeProvider?.models?.[0] ?? null;
      activeModelLabel =
        activeModel?.name ?? activeProvider?.featuredModels?.[0] ?? strings.composer.modelFallback;
    }

    // Sync the composer button label.
    const labelEl = modelButton?.querySelector('.chat-composer__model-label');
    if (labelEl) labelEl.textContent = activeModelLabel;
  }

  window.addEventListener('joanium:app-settings-changed', (event) => {
    // Always honour an explicit change from settings — it means the user
    // intentionally picked a model there, so override any in-chat selection.
    userOverrodeModel = false;
    applyDefaultModelFromSettings(event.detail);
  });

  return {
    element: view,
    clearConversation,
    focusComposer,
    loadSession,
    setActiveProject: applyActiveProject,
    setActivePersona(persona) {
      activePersona = persona ?? null;
    },
    getCurrentSessionId() {
      return sessionId;
    },
    // Called by ShellApp when the user navigates away from chat — detaches the
    // native BrowserView so it doesn't paint over other panels.
    pauseBrowserPreview() {
      browserPreview.pause();
    },
    // Called by ShellApp when the user returns to chat — re-syncs the native
    // BrowserView bounds so it reappears in the correct position.
    resumeBrowserPreview() {
      browserPreview.resume();
    },
  };
}
