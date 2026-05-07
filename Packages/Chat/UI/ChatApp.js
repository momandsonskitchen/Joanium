import { getTimeGreetings } from '../../../Datasets/messages.js';
import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace, truncate } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createIcon, iconMarkup } from '../../Shared/Icons/Icons.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { initCompletionSound, markCompletionSoundAborted, playCompletionSound } from './CompletionSound.js';

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
 * Strips inline thinking tags that various models embed in their text stream.
 * Handles: <think>, <thinking>, <reasoning>, <thought>, <thoughts>, <scratchpad>, <analysis>, <chain_of_thought>
 */
function parseThinkingFromText(text) {
  if (!text) return { content: '', thinking: '' };

  const pairs = [
    ['<thinking>', '</thinking>'],
    ['<think>', '</think>'],
    ['<reasoning>', '</reasoning>'],
    ['<thought>', '</thought>'],
    ['<thoughts>', '</thoughts>'],
    ['<scratchpad>', '</scratchpad>'],
    ['<analysis>', '</analysis>'],
    ['<chain_of_thought>', '</chain_of_thought>'],
  ];

  let thinking = '';
  let content = text;

  for (const [open, close] of pairs) {
    let result = '';
    let remaining = content;

    while (remaining.length > 0) {
      const start = remaining.indexOf(open);
      if (start === -1) {
        result += remaining;
        break;
      }

      result += remaining.slice(0, start);
      const end = remaining.indexOf(close, start + open.length);

      if (end === -1) {
        // Unclosed tag — still streaming, treat the rest as thinking
        thinking += remaining.slice(start + open.length);
        break;
      }

      thinking += remaining.slice(start + open.length, end);
      remaining = remaining.slice(end + close.length);
    }

    content = result;
  }

  return { content: content.trimStart(), thinking: thinking.trim() };
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

function createMessageActions({ onCopy, onRetry, onSpeak }) {
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
      message.stopped ? 'chat-message--stopped' : ''
    ].filter(Boolean).join(' ')
  );

  if (message.role === 'assistant') {
    const thinkingWrap = document.createElement('details');
    thinkingWrap.className = 'chat-message__thinking';
    thinkingWrap.hidden = !message.thinking;

    const thinkingSummary = createElement('summary', 'chat-message__thinking-summary');
    thinkingSummary.append(
      createIcon('thinking', 'chat-message__thinking-icon'),
      createElement('span', 'chat-message__thinking-label', strings.composer.reasoning)
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

  if (!message.streaming && !message.pending && typeof onCopy === 'function' && typeof onRetry === 'function') {
    const onSpeak = message.role === 'assistant'
      ? (btn) => speakText(message.content, btn)
      : undefined;
    article.append(createMessageActions({ onCopy, onRetry, onSpeak }));
  }

  return article;
}

function updateLastStreamingMessage(threadEl, { content, thinking }) {
  const lastEl = threadEl?.lastElementChild;
  if (!lastEl || !lastEl.classList.contains('chat-message--assistant')) return;

  const thinkingWrap = lastEl.querySelector('.chat-message__thinking');
  const thinkingText = lastEl.querySelector('.chat-message__thinking-text');
  if (thinkingWrap && thinkingText && thinking) {
    thinkingText.textContent = thinking;
    thinkingWrap.hidden = false;
  }

  const bubble = lastEl.querySelector('.chat-message__bubble');
  if (bubble && content) {
    bubble.querySelector('.chat-message__dots')?.remove();
    bubble.querySelector('.chat-message__stream-dot')?.remove();

    // Re-render markdown live into the bubble
    const fresh = renderMarkdown(content.trimStart(), 'chat-message__md');
    const existing = bubble.querySelector('.chat-message__md, .chat-message__text');
    if (existing) {
      bubble.replaceChild(fresh, existing);
    } else {
      bubble.append(fresh);
    }

    bubble.append(createElement('span', 'chat-message__stream-dot'));
  }

  lastEl.scrollIntoView({ block: 'end', behavior: 'smooth' });
}

function getPreferredProvider(payload) {
  const selectedIds = payload.user?.providers?.selected ?? [];
  const byId = new Map(payload.providers.map((provider) => [provider.id, provider]));
  const ordered = [
    ...selectedIds.map((id) => byId.get(id)).filter(Boolean),
    ...payload.providers.filter((provider) => !selectedIds.includes(provider.id))
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

      const dot = createElement('span', 'chat-model-picker__health-dot chat-model-picker__health-dot--unknown');
      dot.setAttribute('aria-label', strings.composer.healthYellow);
      const label = createElement('span', 'chat-model-picker__option-label', model.name ?? model.id);
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
    if (status === 'green')  return strings.composer.healthGreen;
    if (status === 'red')    return strings.composer.healthRed;
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
  invokeIpc('chat:health-get').then((healthMap) => {
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
  }).catch(() => {});

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
    }
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
    truncated: Boolean(attachment.truncated)
  };
}

function buildAttachmentContext(strings, attachments) {
  if (!attachments.length) return '';

  const blocks = attachments.map((attachment, index) => {
    const header = formatText(strings.composer.attachmentContextItem, {
      index: String(index + 1),
      name: attachment.name ?? strings.composer.unknownAttachment
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
  const badge = createElement('span', 'chat-attachment__badge', getFileExtension(attachment.name));
  const body = createElement('span', 'chat-attachment__body');
  const name = createElement('span', 'chat-attachment__name', attachment.name || strings.composer.unknownAttachment);
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
        name: attachment.name || strings.composer.unknownAttachment
      })
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
  canGoForward: false
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
  eyebrow.append(createIcon('globe', 'browser-preview__eyebrow-icon'), createElement('span', '', strings.eyebrow));
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

  const form = createElement('form', 'browser-preview__form');
  const input = document.createElement('input');
  input.className = 'browser-preview__input';
  input.type = 'url';
  input.placeholder = strings.placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  const openButton = createElement('button', 'browser-preview__open');
  openButton.type = 'submit';
  openButton.append(createIcon('arrowRight', 'browser-preview__open-icon'), createElement('span', '', strings.open));
  form.append(input, openButton);

  const statusRow = createElement('div', 'browser-preview__status-row');
  const statusDot = createElement('span', 'browser-preview__status-dot browser-preview__status-dot--idle');
  const statusText = createElement('span', 'browser-preview__status', strings.ready);
  statusRow.append(statusDot, statusText);

  const mount = createElement('div', 'browser-preview__mount');
  mount.id = 'browser-preview-mount';
  const viewport = createElement('div', 'browser-preview__viewport');
  const empty = createElement('div', 'browser-preview__empty');
  empty.append(
    createIcon('globe', 'browser-preview__empty-icon'),
    createElement('strong', 'browser-preview__empty-title', strings.emptyTitle),
    createElement('span', 'browser-preview__empty-copy', strings.emptyCopy)
  );
  mount.append(viewport, empty);
  panel.append(header, form, statusRow, mount);

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
          height: Math.round(rect.height)
        };
      }
    }

    const boundsKey = bounds
      ? `${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`
      : 'null';
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
    statusText.textContent = currentState.status || (currentState.loading ? strings.loading : strings.ready);
    setTone(browserPreviewTone(currentState));

    backButton.disabled = !currentState.canGoBack;
    forwardButton.disabled = !currentState.canGoForward;
    reloadButton.disabled = !currentState.hasPage;

    if (currentState.url && document.activeElement !== input) {
      input.value = currentState.url;
    }

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
    void invokeIpc('browser-preview:close').then(applyState).catch(() => {});
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    statusText.textContent = strings.loading;
    void invokeIpc('browser-preview:load-url', value).then(applyState).catch((error) => {
      applyState({
        ...currentState,
        visible: true,
        loading: false,
        status: error?.message ?? strings.loadFailed
      });
    });
  });

  return {
    element: panel,
    start() {
      disposeStateListener = onIpc('browser-preview:state', applyState);
      window.addEventListener('resize', scheduleBoundsSync);
      invokeIpc('browser-preview:get-state').then(applyState).catch(() => applyState(DEFAULT_BROWSER_PREVIEW_STATE));
    },
    stop() {
      disposeStateListener?.();
      disposeStateListener = null;
      window.removeEventListener('resize', scheduleBoundsSync);
      cancelAnimationFrame(animationFrameId);
      void invokeIpc('browser-preview:set-bounds', null);
    }
  };
}

export async function createChatView(strings, {
  getActiveProject,
  onActiveProjectChange,
  getActivePersona,
  onActivePersonaChange,
  getProfile
} = {}) {
  initCompletionSound();

  const payload = await invokeIpc('chat:bootstrap');
  const view = createElement('div', 'chat-view');
  const profile = getProfile?.() ?? payload.user?.profile ?? {};
  const firstName = getFirstName(profile.name, strings.appName);
  const hour = new Date().getHours();
  const greetings = getTimeGreetings(hour, firstName);

  let activeProvider = getPreferredProvider(payload);
  let activeModel = activeProvider?.models?.[0] ?? null;
  let activeModelLabel = activeModel?.name ?? activeProvider?.featuredModels?.[0] ?? strings.composer.modelFallback;
  let activePersona = getActivePersona?.() ?? null;
  let activeProject = getActiveProject?.() ?? null;
  let draftValue = '';
  let pendingAttachments = [];
  let attachmentNoticeTimer = null;
  let isSending = false;
  let accText = '';
  let accThinking = '';
  let sessionId = null;
  let sessionCreatedAt = null;
  let messages = [];
  let streamDisposers = [];
  let modelPickerPanel = null;
  let modelPickerDispose = null;
  let modelPickerOpen = false;

  let composerField = null;
  let attachmentsEl = null;
  let attachmentNotice = null;
  let sendButton = null;
  let thread = null;
  let title = null;
  let composer = null;
  let scroll = null;
  let bottom = null;

  let projectPill = null;
  let projectNameEl = null;
  let projectMetaEl = null;
  let modelButton = null;

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
      attachmentsEl.append(createAttachmentPill(attachment, strings, {
        removable: true,
        onRemove(id) {
          pendingAttachments = pendingAttachments.filter((item) => item.id !== id);
          renderPendingAttachments();
          syncComposer();
          focusComposer();
        }
      }));
    }
  }

  async function selectAttachments() {
    if (isSending) return;

    try {
      showAttachmentNotice(strings.composer.attachmentProcessing);
      const result = await invokeIpc('chat:select-attachments');
      const incoming = Array.isArray(result?.attachments) ? result.attachments : [];
      const rejected = Array.isArray(result?.rejected) ? result.rejected : [];

      if (incoming.length > 0) {
        pendingAttachments = [...pendingAttachments, ...incoming];
        renderPendingAttachments();
        syncComposer();
        showAttachmentNotice(
          formatText(strings.composer.attachmentAdded, { count: String(incoming.length) })
        );
      } else if (rejected.length === 0) {
        attachmentNotice.hidden = true;
      }

      if (rejected.length > 0) {
        showAttachmentNotice(
          formatText(strings.composer.attachmentRejected, { count: String(rejected.length) }),
          'warning'
        );
      }
    } catch (error) {
      showAttachmentNotice(
        formatText(strings.composer.attachmentFailed, {
          message: error?.message ?? String(error)
        }),
        'warning'
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
    if (!sessionId || messages.length === 0) return;
    const firstUser = messages.find((message) => message.role === 'user');
    if (!firstUser) return;

    const now = new Date().toISOString();
    const sessionMessages = messages
      .filter((message) => !message.streaming && !message.pending && message.content)
      .map(({ role, content, thinking, modelContent, attachments }) => {
        const entry = { role, content };
        if (thinking) entry.thinking = thinking;
        if (modelContent && modelContent !== content) entry.modelContent = modelContent;
        if (attachments?.length) entry.attachments = attachments.map(toAttachmentSummary);
        return entry;
      });

    const sessionData = {
      id: sessionId,
      title: truncate(collapseWhitespace(firstUser.content), 60),
      createdAt: sessionCreatedAt ?? now,
      updatedAt: now,
      messages: sessionMessages
    };

    if (activeProject?.id) {
      sessionData.projectId = activeProject.id;
    }

    await invokeIpc('history:save-session', sessionData);
  }

  function buildProjectContext(project) {
    if (!project) return '';

    const lines = [
      formatText(strings.projects.systemContextName, { name: project.name ?? '' })
    ];
    const info = collapseWhitespace(project.info);

    if (info) {
      lines.push(formatText(strings.projects.systemContextInfo, { info }));
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

  function applyActiveProject(project) {
    activeProject = project ? {
      id: project.id,
      name: project.name ?? '',
      icon: project.icon ?? '',
      info: project.info ?? '',
      coverImagePath: project.coverImagePath ?? ''
    } : null;
    syncActiveProjectPill();
  }

  function clearActiveProject() {
    applyActiveProject(null);
    onActiveProjectChange?.(null);
  }

  function syncActiveProjectPill() {
    if (!projectPill || !projectNameEl || !projectMetaEl) return;

    if (!activeProject) {
      projectPill.hidden = true;
      projectNameEl.textContent = '';
      projectMetaEl.textContent = '';
      return;
    }

    projectPill.hidden = false;
    projectNameEl.textContent = activeProject.name;
    projectMetaEl.textContent = collapseWhitespace(activeProject.info) || strings.projects.activeHint;
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
          thinking: message.thinking ?? '',
          streaming: false
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
      const isActive = option._pickerProviderId === activeProvider?.id
        && option._pickerModelId === activeModel?.id;
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
            const labelEl = triggerButton.querySelector('.chat-composer__model-label');
            if (labelEl) labelEl.textContent = activeModelLabel;
            syncPickerActiveStates();
            closeModelPicker();
          }
        });
        modelPickerPanel   = picker.element;
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

  function stopStream() {
    markCompletionSoundAborted();
    removeStreamListeners();
    const stoppedNote = strings.composer.generationStopped;
    messages = messages.map((message, index) => {
      if (index !== messages.length - 1) return message;
      const { content: parsedStopped, thinking: inlineStopped } = parseThinkingFromText(accText);
      const content = parsedStopped ? `${parsedStopped}\n\n${stoppedNote}` : stoppedNote;
      return {
        role: 'assistant',
        content,
        thinking: accThinking || inlineStopped,
        streaming: false,
        stopped: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel
      };
    });
    accText = '';
    accThinking = '';
    isSending = false;
    void saveCurrentSession();
    syncComposer();
    renderThread();
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
      sendButton.disabled = !draftValue.trim() && pendingAttachments.length === 0;
      sendButton.classList.remove('chat-composer__send--stop');
      if (iconEl) iconEl.innerHTML = iconMarkup.send;
      if (labelEl) {
        labelEl.textContent = '';
        labelEl.hidden = true;
      }
    }
  }

  function focusComposer() {
    if (!composerField) return;
    composerField.focus();
    composerField.setSelectionRange(draftValue.length, draftValue.length);
  }

  function clearConversation() {
    messages = [];
    draftValue = '';
    pendingAttachments = [];
    isSending = false;
    sessionId = null;
    sessionCreatedAt = null;
    removeStreamListeners();
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

  function renderThread() {
    if (!thread || !title || !composer || !scroll || !bottom) return;

    if (window.speechSynthesis && activeSpeakBtn) {
      window.speechSynthesis.cancel();
      resetSpeakButton(activeSpeakBtn);
      activeSpeakBtn = null;
    }

    const hasMessages = messages.length > 0;
    title.hidden = hasMessages;
    thread.hidden = !hasMessages;
    composer.classList.toggle('chat-composer--conversation', hasMessages);
    scroll.classList.toggle('chat-stage__scroll--conversation', hasMessages);
    bottom.classList.toggle('chat-stage__bottom--conversation', hasMessages);

    if (!hasMessages) {
      thread.replaceChildren();
      return;
    }

    thread.replaceChildren(...messages.map((message, index) => {
      const onCopy = () => navigator.clipboard.writeText(message.content ?? '').catch(() => {});
      const onRetry = () => {
        if (isSending) return;
        const userIndex = message.role === 'user' ? index : index - 1;
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
          attachments: userMessage.attachments ?? []
        });
      };
      return createMessageElement(message, strings, { onCopy, onRetry });
    }));

    requestAnimationFrame(() => {
      thread.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
  }

  async function submitPrompt(resend = null) {
    const attachmentsForSend = Array.isArray(resend?.attachments)
      ? resend.attachments
      : pendingAttachments;
    const prompt = String(resend?.content ?? draftValue).trim()
      || (attachmentsForSend.length ? strings.composer.attachmentOnlyPrompt : '');

    if ((!prompt && attachmentsForSend.length === 0) || isSending) return;

    const isNewSession = !sessionId;
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionCreatedAt = new Date().toISOString();
    }

    const modelContent = resend?.modelContent
      || buildModelContent(strings, prompt, attachmentsForSend);
    const attachmentSummaries = attachmentsForSend.map(toAttachmentSummary);

    messages = [
      ...messages,
      {
        role: 'user',
        content: prompt,
        modelContent,
        attachments: attachmentSummaries
      },
      {
        role: 'assistant',
        content: '',
        thinking: '',
        streaming: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel
      }
    ];

    draftValue = '';
    pendingAttachments = [];
    isSending = true;
    accText = '';
    accThinking = '';
    const generationStartTime = Date.now();
    renderPendingAttachments();
    syncComposer();
    renderThread();
    focusComposer();
    removeStreamListeners();

    streamDisposers.push(onIpc('chat:stream-chunk', (chunk) => {
      if (chunk?.type === 'text' && chunk.text) accText += chunk.text;
      if (chunk?.type === 'thinking' && chunk.text) accThinking += chunk.text;
      const { content: displayContent, thinking: inlineThinking } = parseThinkingFromText(accText);
      const displayThinking = accThinking || inlineThinking;
      updateLastStreamingMessage(thread, { content: displayContent, thinking: displayThinking });
    }));

    streamDisposers.push(onIpc('chat:stream-done', (meta) => {
      removeStreamListeners();
      const { content: parsedContent, thinking: inlineThinking } = parseThinkingFromText(accText);
      messages = messages.map((message, index) => index !== messages.length - 1 ? message : {
        role: 'assistant',
        content: parsedContent || strings.composer.emptyResponse,
        thinking: accThinking || inlineThinking,
        streaming: false,
        providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
        modelLabel: meta?.modelLabel ?? activeModelLabel
      });
      isSending = false;
      void saveCurrentSession();
      void playCompletionSound(generationStartTime);
      syncComposer();
      renderThread();
    }));

    streamDisposers.push(onIpc('chat:stream-error', (error) => {
      removeStreamListeners();
      messages = messages.map((message, index) => index !== messages.length - 1 ? message : {
        role: 'assistant',
        content: error?.message || strings.composer.responseError,
        thinking: accThinking,
        streaming: false,
        error: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel
      });
      isSending = false;
      syncComposer();
      renderThread();
    }));

    const historyToSend = messages.slice(0, -1).map(({ role, content, modelContent }) => ({
      role,
      content: role === 'user' ? (modelContent || content) : content
    }));
    const memoryContext = await loadMemoryContext();

    void invokeIpc('chat:stream-message', {
      messages: historyToSend,
      providerId: activeProvider?.id ?? null,
      modelId: activeModel?.id ?? null,
      memoryContext: memoryContext || null,
      projectInfo: buildProjectContext(activeProject) || null,
      persona: (getActivePersona?.() ?? activePersona)?.content || null,
      isNewSession
    });
  }

  scroll = createElement('div', 'chat-stage__scroll');
  bottom = createElement('div', 'chat-stage__bottom');
  title = createElement(
    'h1',
    'chat-stage__title',
    greetings[Math.floor(Math.random() * greetings.length)]
  );
  thread = createElement('section', 'chat-thread');
  thread.hidden = true;

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

  composerField = document.createElement('textarea');
  composerField.className = 'chat-composer__field';
  composerField.placeholder = strings.composer.placeholder;
  composerField.rows = 1;
  composerField.addEventListener('input', (event) => {
    draftValue = event.target.value;
    syncComposerFieldHeight();
    syncComposer();
  });
  composerField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitPrompt();
    }
  });

  const composerFooter = createElement('div', 'chat-composer__footer');
  const composerActions = createElement('div', 'chat-composer__actions');
  const attachBtn = createElement('button', 'chat-composer__icon-button');
  attachBtn.type = 'button';
  attachBtn.setAttribute('aria-label', strings.composer.attachFiles);
  attachBtn.append(createIcon('paperclip', 'chat-composer__icon'));
  attachBtn.addEventListener('click', () => {
    void selectAttachments();
  });

  composerActions.append(attachBtn);

  const composerSubmit = createElement('div', 'chat-composer__submit');
  modelButton = createElement('button', 'chat-composer__model');
  modelButton.type = 'button';
  modelButton.append(
    createElement('span', 'chat-composer__model-label', activeModelLabel),
    createIcon('chevronDown', 'chat-composer__model-icon')
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
  composer.append(projectPill, attachmentsEl, attachmentNotice, composerField, composerFooter);
  scroll.append(title, thread);
  bottom.append(composer);
  const browserPreview = createBrowserPreviewPanel(strings.browserPreview, {
    onVisibilityChange: (visible) => {
      view.classList.toggle('chat-view--browser-preview', visible);
    }
  });
  view.append(scroll, bottom, browserPreview.element);
  browserPreview.start();

  applyActiveProject(activeProject);
  syncComposer();
  renderThread();

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
    }
  };
}
