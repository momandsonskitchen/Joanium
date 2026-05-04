import en from '../I18n/en.js';
import de from '../I18n/de.js';
import fr from '../I18n/fr.js';
import { formatText, createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace, truncate } from '../../Shared/Utils/StringUtils.js';
import { createLogoLoader } from '../../Shared/LogoLoader/LogoLoader.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';

const dictionaries = { en, de, fr };

const iconMarkup = {
  paperclip: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9.5 12.5 5.8-5.8a3.5 3.5 0 1 1 5 5l-8.2 8.2a5 5 0 1 1-7.1-7.1l8.4-8.4" />
    </svg>
  `,
  chevronDown: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m7 10 5 5 5-5" />
    </svg>
  `,
  send: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h12" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  `,
  stop: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  `,
  check: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12l5 5 9-9" />
    </svg>
  `,
  copy: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  `,
  retry: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  `,
  thinking: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.5 2a4 4 0 0 1 4 4 4 4 0 0 1 4 4 4 4 0 0 1-2.4 3.7V15a2.5 2.5 0 0 1-5 0v-1.3A4 4 0 0 1 7.5 10a4 4 0 0 1 2-3.46V6a4 4 0 0 1 0-.5A4 4 0 0 1 9.5 2Z" />
      <path d="M9.5 15v3a2 2 0 0 0 4 0v-3" />
    </svg>
  `,
  volumeOn: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4V5Z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  `,
  volumeStop: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4V5Z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  `,
  tabChat: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  `,
  tabHistory: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  `,
  tabTemplates: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  `,
  tabProjects: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  `,
  tabAgents: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  `,
  tabSkills: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 3.5a2 2 0 0 0-4 0V5H7a1 1 0 0 0-1 1v3.5H4.5a2 2 0 0 0 0 4H6V17a1 1 0 0 0 1 1h3.5v1.5a2 2 0 0 0 4 0V18H18a1 1 0 0 0 1-1v-3.5h1.5a2 2 0 0 0 0-4H19V6a1 1 0 0 0-1-1h-3.5V3.5z" />
    </svg>
  `,
  tabPersonas: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  `,
  tabMarketplace: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  `,
  tabEvents: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  `,
  tabUsage: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  `
};

function getDictionary(locale) {
  return dictionaries[locale] ?? en;
}

function createIcon(name, className = '') {
  const icon = createElement('span', className || 'chat-icon');
  icon.innerHTML = iconMarkup[name] ?? '';
  return icon;
}

function getFirstName(name, fallback) {
  const normalized = collapseWhitespace(name);
  if (!normalized) return fallback;
  return normalized.split(' ')[0];
}

function getGreetingKey(date) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// ---------------------------------------------------------------------------
// getInitials — first letter of first name + second letter of last name.
// Single-word names use the first two letters.
// ---------------------------------------------------------------------------
function getInitials(name) {
  const parts = collapseWhitespace(name).split(' ').filter(Boolean);

  if (parts.length >= 2) {
    const firstLetter = parts[0][0].toUpperCase();
    const lastWord = parts[parts.length - 1];
    const secondLetter = (lastWord[1] ?? lastWord[0]).toUpperCase();
    return `${firstLetter}${secondLetter}`;
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return '?';
}

function createDraftEntry(prompt) {
  const normalized = collapseWhitespace(prompt);
  if (!normalized) return null;
  const sentence = normalized.split(/[.!?]/).find(Boolean) ?? normalized;
  return {
    title: truncate(collapseWhitespace(sentence), 48),
    summary: truncate(normalized, 112),
    prompt: normalized,
    updatedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// stripMarkdown — removes code blocks, inline code, and markup symbols so
// only plain readable prose is passed to the speech synthesiser.
// ---------------------------------------------------------------------------
function stripMarkdown(text) {
  return text
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^~~~[\s\S]*?^~~~/gm, '')
    .replace(/`[^`\n]+`/g, '')
    .replace(/^[=-]{2,}\s*$/gm, '')
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

// ---------------------------------------------------------------------------
// TTS state — module-level so only one utterance plays at a time.
// ---------------------------------------------------------------------------
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

  const text = stripMarkdown(rawText ?? '');
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);

  const finish = () => {
    resetSpeakButton(btn);
    activeSpeakBtn = null;
  };

  utterance.onend   = finish;
  utterance.onerror = finish;

  activeSpeakBtn = btn;
  btn.classList.add('chat-message__action-button--speaking');
  const iconEl = btn.querySelector('.chat-message__action-icon');
  if (iconEl) iconEl.innerHTML = iconMarkup.volumeStop ?? '';

  window.speechSynthesis.speak(utterance);
}

// ---------------------------------------------------------------------------
// Message action bar — copy + retry + optional TTS speak.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// createMessageElement — builds a chat bubble for any state.
// ---------------------------------------------------------------------------
function createMessageElement(message, { onCopy, onRetry } = {}) {
  const article = createElement(
    'article',
    ['chat-message', `chat-message--${message.role}`,
      message.streaming ? 'chat-message--streaming' : '',
      message.error     ? 'chat-message--error'     : '',
      message.stopped   ? 'chat-message--stopped'   : ''
    ].filter(Boolean).join(' ')
  );

  if (message.role === 'assistant') {
    const thinkingWrap = document.createElement('details');
    thinkingWrap.className = 'chat-message__thinking';
    thinkingWrap.hidden = !message.thinking;

    const thinkingSummary = createElement('summary', 'chat-message__thinking-summary');
    thinkingSummary.append(
      createIcon('thinking', 'chat-message__thinking-icon'),
      createElement('span', 'chat-message__thinking-label', 'Reasoning')
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
    } else {
      const textSpan = createElement('span', 'chat-message__text', (message.content ?? '').trimStart());
      bubble.append(textSpan);
      if (message.streaming) bubble.append(createElement('span', 'chat-message__stream-dot'));
    }

    article.append(bubble);
  } else {
    article.append(createElement('div', 'chat-message__bubble', message.content));
  }

  if (!message.streaming && !message.pending && typeof onCopy === 'function' && typeof onRetry === 'function') {
    const onSpeak = message.role === 'assistant'
      ? (btn) => speakText(message.content, btn)
      : undefined;

    article.append(createMessageActions({ onCopy, onRetry, onSpeak }));
  }

  return article;
}

// ---------------------------------------------------------------------------
// updateLastStreamingMessage — patches the live bubble token-by-token.
// ---------------------------------------------------------------------------
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

    let textSpan = bubble.querySelector('.chat-message__text');
    if (!textSpan) {
      textSpan = createElement('span', 'chat-message__text');
      bubble.prepend(textSpan);
    }
    textSpan.textContent = content.trimStart();

    if (!bubble.querySelector('.chat-message__stream-dot')) {
      bubble.append(createElement('span', 'chat-message__stream-dot'));
    }
  }

  lastEl.scrollIntoView({ block: 'end', behavior: 'smooth' });
}

function getPreferredProvider(payload) {
  const selectedIds = payload.user?.providers?.selected ?? [];
  const byId = new Map(payload.providers.map((p) => [p.id, p]));
  const ordered = [
    ...selectedIds.map((id) => byId.get(id)).filter(Boolean),
    ...payload.providers.filter((p) => !selectedIds.includes(p.id))
  ];

  return (
    ordered.find((p) => {
      const details = payload.user?.providers?.details?.[p.id] ?? {};
      return (
        Boolean(p.models?.[0]?.id) &&
        Boolean(collapseWhitespace(details.endpoint) || collapseWhitespace(p.endpoint)) &&
        (p.requiresApiKey ? Boolean(collapseWhitespace(details.apiKey)) : true)
      );
    }) ??
    ordered.find((p) => p.models?.length > 0) ??
    payload.providers[0] ??
    null
  );
}

// ---------------------------------------------------------------------------
// createModelPickerPanel — floating portal for switching provider + model.
// ---------------------------------------------------------------------------
function createModelPickerPanel({ providers, userProviderDetails, onSelect }) {
  const panel = createElement('div', 'chat-model-picker');
  document.body.append(panel);

  const scroller = createElement('div', 'chat-model-picker__scroller');
  panel.append(scroller);

  const readyProviders = providers.filter((p) => {
    if (!p.models?.length) return false;
    const details = userProviderDetails?.[p.id] ?? {};
    const endpoint = collapseWhitespace(details.endpoint) || collapseWhitespace(p.endpoint);
    if (!endpoint) return false;
    if (p.requiresApiKey && !collapseWhitespace(details.apiKey)) return false;
    return true;
  });

  for (const provider of readyProviders) {
    const group = createElement('div', 'chat-model-picker__group');
    group.append(createElement('div', 'chat-model-picker__group-header', provider.label));

    for (const model of provider.models) {
      const option = createElement('button', 'chat-model-picker__option');
      option._pickerProviderId = provider.id;
      option._pickerModelId = model.id;
      option.append(createElement('span', 'chat-model-picker__option-label', model.name ?? model.id));
      option.addEventListener('click', (e) => { e.stopPropagation(); onSelect(provider, model); });
      group.append(option);
    }

    scroller.append(group);
  }

  const scrollbar = attachCustomScrollbar(panel, scroller);
  return { element: panel, dispose: scrollbar.dispose };
}

// ---------------------------------------------------------------------------
// Session ID generation — datetime-based, safe for filenames.
// ---------------------------------------------------------------------------
function generateSessionId() {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`;
}

// ---------------------------------------------------------------------------
// History date helpers — groups sessions and formats display timestamps.
// ---------------------------------------------------------------------------
function getSessionGroup(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return 'today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'yesterday';
  return 'earlier';
}

function formatSessionTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() >= startOfToday.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (startOfDay.getTime() >= startOfYesterday.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// bootstrap — entry point; builds the full UI tree.
// ---------------------------------------------------------------------------
async function bootstrap() {
  const payload = await window.JoaniumChat.bootstrap();
  const strings = getDictionary(payload.user.locale);
  const root = document.getElementById('app');
  const firstName = getFirstName(payload.user.profile.name, strings.appName);
  const greetingKey = getGreetingKey(new Date());

  let activeProvider = getPreferredProvider(payload);
  let activeModel = activeProvider?.models?.[0] ?? null;
  let activeModelLabel = activeModel?.name ?? activeProvider?.featuredModels?.[0] ?? strings.composer.modelFallback;

  let draftValue = '';
  let isSending = false;
  let accText = '';
  let accThinking = '';

  // Session tracking — null means this is an unsaved new conversation.
  let sessionId = null;
  let sessionCreatedAt = null;

  // DOM refs set during build
  let composerField = null;
  let sendButton = null;
  let thread = null;
  let title = null;
  let subtitle = null;
  let logoEl = null;
  let composer = null;
  let canvas = null;
  let scroll = null;
  let bottom = null;
  let messages = [];

  // Model picker state
  let modelPickerPanel = null;
  let modelPickerScrollbar = null;
  let modelPickerOpen = false;
  let modelButton = null;

  // Tab state
  let activeTabEl = null;
  let lastSelectedEntry = null;
  const tabElements = {};

  // History panel — created lazily the first time the history tab is opened.
  let historyPanel = null;

  // ---------------------------------------------------------------------------
  // Session persistence
  // ---------------------------------------------------------------------------

  async function saveCurrentSession() {
    if (!sessionId || messages.length === 0) return;
    const firstUser = messages.find((m) => m.role === 'user');
    if (!firstUser) return;

    const title = truncate(collapseWhitespace(firstUser.content), 60);
    const now = new Date().toISOString();

    const sessionMessages = messages
      .filter((m) => !m.streaming && !m.pending && m.content)
      .map(({ role, content, thinking }) => {
        const entry = { role, content };
        if (thinking) entry.thinking = thinking;
        return entry;
      });

    await window.JoaniumChat.saveSession({
      id: sessionId,
      title,
      createdAt: sessionCreatedAt ?? now,
      updatedAt: now,
      messages: sessionMessages
    });
  }

  // ---------------------------------------------------------------------------
  // View switching — history panel replaces scroll + bottom fully.
  // ---------------------------------------------------------------------------

  function showChatView() {
    scroll.hidden = false;
    bottom.hidden = false;
    if (historyPanel) historyPanel.hidden = true;
  }

  async function showHistoryView() {
    scroll.hidden = true;
    bottom.hidden = true;

    if (!historyPanel) {
      historyPanel = buildHistoryPanel();
      canvas.append(historyPanel);
    }

    historyPanel.hidden = false;
    await populateHistoryPanel(historyPanel._contentEl);
  }

  // Programmatic tab switch — updates sidebar visual without triggering side-effects.
  function switchToTab(id) {
    const targetTab = tabElements[id];
    if (!targetTab || targetTab === activeTabEl) return;
    activeTabEl?.classList.remove('chat-sidebar__tab--active');
    targetTab.classList.add('chat-sidebar__tab--active');
    activeTabEl = targetTab;
    moveIndicatorToTab(targetTab, true);
  }

  // ---------------------------------------------------------------------------
  // History panel DOM
  // ---------------------------------------------------------------------------

  function buildHistoryPanel() {
    const panel = createElement('div', 'chat-history');
    panel.hidden = true;

    const header = createElement('div', 'chat-history__header');
    const headerTitle = createElement('h2', 'chat-history__title', strings.history.title);

    const newChatBtn = createElement('button', 'chat-history__new-btn');
    newChatBtn.type = 'button';
    const newIconEl = createElement('span', 'chat-history__new-icon');
    newIconEl.innerHTML = iconMarkup.tabChat ?? '';
    newChatBtn.append(newIconEl, createElement('span', 'chat-history__new-label', strings.history.newChat));
    newChatBtn.addEventListener('click', () => {
      clearConversation();
      switchToTab('chat');
      showChatView();
    });

    header.append(headerTitle, newChatBtn);

    const contentEl = createElement('div', 'chat-history__content');
    panel.append(header, contentEl);
    panel._contentEl = contentEl;

    return panel;
  }

  async function populateHistoryPanel(contentEl) {
    // Show loading skeletons while fetching
    contentEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      contentEl.append(createElement('div', 'chat-history__skeleton'));
    }

    const sessions = await window.JoaniumChat.listSessions();
    contentEl.replaceChildren();

    if (sessions.length === 0) {
      const empty = createElement('div', 'chat-history__empty');
      empty.append(
        createElement('p', 'chat-history__empty-title', strings.history.empty),
        createElement('p', 'chat-history__empty-hint', strings.history.emptyHint)
      );
      contentEl.append(empty);
      return;
    }

    const groups = { today: [], yesterday: [], earlier: [] };
    for (const session of sessions) {
      const group = getSessionGroup(session.updatedAt);
      groups[group].push(session);
    }

    const groupLabels = {
      today: strings.history.today,
      yesterday: strings.history.yesterday,
      earlier: strings.history.earlier
    };

    for (const [groupKey, groupSessions] of Object.entries(groups)) {
      if (groupSessions.length === 0) continue;

      const section = createElement('div', 'chat-history__section');
      section.append(createElement('div', 'chat-history__section-label', groupLabels[groupKey]));

      for (const session of groupSessions) {
        const card = createElement('button', 'chat-history__card');
        card.type = 'button';

        const msgCount = session.messageCount ?? 0;
        const msgLabel = msgCount === 1
          ? strings.history.oneMessage
          : formatText(strings.history.messages, { count: msgCount });

        card.append(
          createElement('div', 'chat-history__card-title', session.title || strings.appName),
          createElement('div', 'chat-history__card-meta', `${msgLabel} · ${formatSessionTime(session.updatedAt)}`)
        );

        card.addEventListener('click', () => void loadHistorySession(session.id));
        section.append(card);
      }

      contentEl.append(section);
    }
  }

  async function loadHistorySession(id) {
    try {
      const session = await window.JoaniumChat.loadSession(id);

      messages = (session.messages ?? [])
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : '',
          thinking: m.thinking ?? '',
          streaming: false
        }))
        .filter((m) => m.content);

      // Restore session context so new messages append to the same file
      sessionId = session.id;
      sessionCreatedAt = session.createdAt ?? new Date().toISOString();

      switchToTab('chat');
      showChatView();
      renderThread();
      focusComposer();
    } catch (err) {
      console.error('[Joanium] Failed to load session:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Model picker
  // ---------------------------------------------------------------------------

  function closeModelPicker() {
    modelPickerPanel?.classList.remove('chat-model-picker--open');
    modelButton?.classList.remove('chat-composer__model--open');
    modelPickerOpen = false;
  }

  function syncPickerActiveStates() {
    if (!modelPickerPanel) return;
    for (const option of modelPickerPanel.querySelectorAll('.chat-model-picker__option')) {
      const isActive = option._pickerProviderId === activeProvider?.id
        && option._pickerModelId === activeModel?.id;
      option.classList.toggle('chat-model-picker__option--active', isActive);
      const existing = option.querySelector('.chat-model-picker__check');
      if (isActive && !existing) option.append(createIcon('check', 'chat-model-picker__check'));
      else if (!isActive && existing) existing.remove();
    }
  }

  function openModelPicker(triggerButton) {
    if (modelPickerOpen) { closeModelPicker(); return; }

    if (!modelPickerPanel) {
      const picker = createModelPickerPanel({
        providers: payload.providers,
        userProviderDetails: payload.user?.providers?.details ?? {},
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
      modelPickerPanel = picker.element;
      modelPickerScrollbar = picker.dispose;
    }

    syncPickerActiveStates();
    modelPickerOpen = true;
    modelButton.classList.add('chat-composer__model--open');
    const rect = triggerButton.getBoundingClientRect();
    modelPickerPanel.style.left = `${rect.left}px`;
    modelPickerPanel.style.bottom = `${window.innerHeight - rect.top + 8}px`;

    requestAnimationFrame(() => modelPickerPanel?.classList.add('chat-model-picker--open'));

    const onDocClick = (e) => {
      if (!modelPickerPanel?.contains(e.target) && !triggerButton.contains(e.target)) {
        closeModelPicker();
        document.removeEventListener('click', onDocClick, { capture: true });
        document.removeEventListener('keydown', onDocKey);
      }
    };
    const onDocKey = (e) => {
      if (e.key === 'Escape') {
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

  // ---------------------------------------------------------------------------
  // Stream control
  // ---------------------------------------------------------------------------

  function stopStream() {
    window.JoaniumChat.removeStreamListeners();
    const stoppedNote = strings.composer.generationStopped;
    messages = messages.map((message, index) => {
      if (index !== messages.length - 1) return message;
      const content = accText ? `${accText}\n\n${stoppedNote}` : stoppedNote;
      return {
        role: 'assistant',
        content,
        thinking: accThinking,
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

  function syncComposer() {
    if (!composerField || !sendButton) return;
    composerField.value = draftValue;

    const iconEl = sendButton.querySelector('.chat-composer__send-icon');
    const labelEl = sendButton.querySelector('.chat-composer__send-label');

    if (isSending) {
      sendButton.disabled = false;
      sendButton.classList.add('chat-composer__send--stop');
      if (iconEl) iconEl.innerHTML = iconMarkup.stop;
      if (labelEl) { labelEl.textContent = strings.composer.stop; labelEl.hidden = false; }
    } else {
      sendButton.disabled = !draftValue.trim();
      sendButton.classList.remove('chat-composer__send--stop');
      if (iconEl) iconEl.innerHTML = iconMarkup.send;
      if (labelEl) { labelEl.textContent = ''; labelEl.hidden = true; }
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
    isSending = false;
    sessionId = null;
    sessionCreatedAt = null;
    window.JoaniumChat.removeStreamListeners();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      resetSpeakButton(activeSpeakBtn);
      activeSpeakBtn = null;
    }
    syncComposer();
    renderThread();
    focusComposer();
  }

  function renderThread() {
    if (!thread || !title || !composer || !canvas || !scroll || !bottom) return;

    if (window.speechSynthesis && activeSpeakBtn) {
      window.speechSynthesis.cancel();
      resetSpeakButton(activeSpeakBtn);
      activeSpeakBtn = null;
    }

    const hasMessages = messages.length > 0;
    logoEl.hidden = hasMessages;
    title.hidden = hasMessages;
    thread.hidden = !hasMessages;
    if (subtitle) subtitle.hidden = hasMessages;
    composer.classList.toggle('chat-composer--conversation', hasMessages);
    scroll.classList.toggle('chat-stage__scroll--conversation', hasMessages);
    bottom.classList.toggle('chat-stage__bottom--conversation', hasMessages);

    if (!hasMessages) { thread.replaceChildren(); return; }

    thread.replaceChildren(...messages.map((message, index) => {
      const onCopy = () => navigator.clipboard.writeText(message.content ?? '').catch(() => {});
      const onRetry = () => {
        if (isSending) return;
        const userIndex = message.role === 'user' ? index : index - 1;
        if (userIndex < 0) return;
        const userMessage = messages[userIndex];
        if (!userMessage?.content) return;
        messages = messages.slice(0, userIndex);
        draftValue = userMessage.content;
        renderThread();
        void submitPrompt();
      };
      return createMessageElement(message, { onCopy, onRetry });
    }));

    requestAnimationFrame(() => {
      thread.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
  }

  // ---------------------------------------------------------------------------
  // submitPrompt — fire-and-forget stream.
  // ---------------------------------------------------------------------------
  async function submitPrompt() {
    const prompt = draftValue.trim();
    if (!prompt || isSending) return;

    // Assign a session ID on the very first message of a new conversation
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionCreatedAt = new Date().toISOString();
    }

    const draftEntry = createDraftEntry(prompt);
    if (draftEntry) void window.JoaniumChat.saveRecentPrompt(draftEntry);

    messages = [
      ...messages,
      { role: 'user', content: prompt },
      { role: 'assistant', content: '', thinking: '', streaming: true,
        providerLabel: activeProvider?.label ?? 'AI', modelLabel: activeModelLabel }
    ];

    draftValue = '';
    isSending = true;
    accText = '';
    accThinking = '';
    lastSelectedEntry = null;
    syncComposer();
    renderThread();
    focusComposer();

    window.JoaniumChat.removeStreamListeners();

    window.JoaniumChat.onStreamChunk((chunk) => {
      if (chunk?.type === 'text'     && chunk.text) accText    += chunk.text;
      if (chunk?.type === 'thinking' && chunk.text) accThinking += chunk.text;
      updateLastStreamingMessage(thread, { content: accText, thinking: accThinking });
    });

    window.JoaniumChat.onStreamDone((meta) => {
      window.JoaniumChat.removeStreamListeners();
      messages = messages.map((m, i) => i !== messages.length - 1 ? m : {
        role: 'assistant',
        content: accText || 'No response received.',
        thinking: accThinking,
        streaming: false,
        providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
        modelLabel: meta?.modelLabel ?? activeModelLabel
      });
      isSending = false;
      void saveCurrentSession();
      syncComposer();
      renderThread();
    });

    window.JoaniumChat.onStreamError((err) => {
      window.JoaniumChat.removeStreamListeners();
      messages = messages.map((m, i) => i !== messages.length - 1 ? m : {
        role: 'assistant',
        content: err?.message || 'Unable to get a response right now.',
        thinking: accThinking,
        streaming: false,
        error: true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel: activeModelLabel
      });
      isSending = false;
      syncComposer();
      renderThread();
    });

    const historyToSend = messages.slice(0, -1).map(({ role, content }) => ({ role, content }));
    void window.JoaniumChat.streamMessage({
      messages: historyToSend,
      providerId: activeProvider?.id ?? null,
      modelId: activeModel?.id ?? null
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM construction
  // ═══════════════════════════════════════════════════════════════════════════

  const shell = createElement('main', 'chat-shell');

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = createElement('nav', 'chat-sidebar');
  const sidebarTabs = createElement('div', 'chat-sidebar__tabs');
  const tabIndicator = createElement('div', 'chat-sidebar__indicator');
  sidebarTabs.append(tabIndicator);

  function moveIndicatorToTab(tabEl, animate) {
    if (!tabEl) return;
    if (!animate) tabIndicator.style.transition = 'none';
    const tabsRect = sidebarTabs.getBoundingClientRect();
    const tabRect = tabEl.getBoundingClientRect();
    tabIndicator.style.top = `${tabRect.top - tabsRect.top}px`;
    tabIndicator.style.height = `${tabRect.height}px`;
    if (!animate) {
      tabIndicator.offsetHeight;
      tabIndicator.style.transition = '';
    }
  }

  for (const [id, label] of Object.entries(strings.tabs)) {
    const isActive = id === 'chat';
    const iconKey = `tab${id.charAt(0).toUpperCase()}${id.slice(1)}`;
    const tab = createElement('button', `chat-sidebar__tab${isActive ? ' chat-sidebar__tab--active' : ''}`);
    tab.type = 'button';
    tab.setAttribute('aria-label', label);
    const iconEl = createElement('span', 'chat-sidebar__tab-icon');
    iconEl.innerHTML = iconMarkup[iconKey] ?? '';
    tab.append(iconEl);
    if (isActive) activeTabEl = tab;

    // Store reference for programmatic switching
    tabElements[id] = tab;

    tab.addEventListener('click', () => {
      if (tab === activeTabEl) {
        // Re-clicking the active chat tab starts a new conversation
        if (id === 'chat') clearConversation();
        return;
      }

      activeTabEl?.classList.remove('chat-sidebar__tab--active');
      tab.classList.add('chat-sidebar__tab--active');
      activeTabEl = tab;
      moveIndicatorToTab(tab, true);

      if (id === 'chat') {
        // Restore chat view — preserve any conversation (including one loaded from history)
        showChatView();
      } else if (id === 'history') {
        void showHistoryView();
      }
    });

    sidebarTabs.append(tab);
  }

  const sidebarAvatar = createElement('button', 'chat-sidebar__avatar');
  sidebarAvatar.type = 'button';
  sidebarAvatar.setAttribute('aria-label', strings.profile);
  sidebarAvatar.append(createElement('span', 'chat-sidebar__avatar-initials', getInitials(payload.user.profile.name)));

  const avatarDivider = createElement('div', 'chat-sidebar__avatar-divider');
  sidebarTabs.append(avatarDivider, sidebarAvatar);

  sidebar.append(sidebarTabs);

  // ── Stage ─────────────────────────────────────────────────────────────────
  const stage = createElement('section', 'chat-stage');
  canvas = createElement('div', 'chat-stage__canvas');

  title = createElement(
    'h1', 'chat-stage__title',
    formatText(strings.greeting[greetingKey], { name: firstName })
  );

  const logoResult = createLogoLoader({ logoPath: payload.logoPath, infinite: true, inline: true });
  logoEl = logoResult.element;
  logoEl.classList.add('chat-stage__logo');

  subtitle = createElement('p', 'chat-stage__subtitle', "You\u2019re doing great \u2014 let\u2019s make today count.");
  thread = createElement('section', 'chat-thread');
  thread.hidden = true;

  // ── Composer ──────────────────────────────────────────────────────────────
  composer = createElement('section', 'chat-composer');
  composerField = document.createElement('textarea');
  composerField.className = 'chat-composer__field';
  composerField.placeholder = strings.composer.placeholder;
  composerField.rows = 3;
  composerField.addEventListener('input', (e) => {
    draftValue = e.target.value;
    lastSelectedEntry = null;
    syncComposer();
  });
  composerField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitPrompt(); }
  });

  const composerFooter = createElement('div', 'chat-composer__footer');
  const composerActions = createElement('div', 'chat-composer__actions');
  const attachBtn = createElement('button', 'chat-composer__icon-button');
  attachBtn.type = 'button';
  attachBtn.append(createIcon('paperclip', 'chat-composer__icon'));
  attachBtn.addEventListener('click', focusComposer);
  composerActions.append(attachBtn);

  const composerSubmit = createElement('div', 'chat-composer__submit');
  modelButton = createElement('button', 'chat-composer__model');
  modelButton.type = 'button';
  modelButton.append(
    createElement('span', 'chat-composer__model-label', activeModelLabel),
    createIcon('chevronDown', 'chat-composer__model-icon')
  );
  modelButton.addEventListener('click', (e) => { e.stopPropagation(); openModelPicker(modelButton); });

  sendButton = createElement('button', 'chat-composer__send');
  sendButton.type = 'button';
  const sendLabel = createElement('span', 'chat-composer__send-label');
  sendLabel.hidden = true;
  sendButton.append(createIcon('send', 'chat-composer__send-icon'), sendLabel);
  sendButton.addEventListener('click', () => {
    if (isSending) stopStream(); else void submitPrompt();
  });

  composerSubmit.append(modelButton, sendButton);
  composerFooter.append(composerActions, composerSubmit);
  composer.append(composerField, composerFooter);

  scroll = createElement('div', 'chat-stage__scroll');
  bottom = createElement('div', 'chat-stage__bottom');

  scroll.append(logoEl, title, subtitle, thread);
  bottom.append(composer);

  const dragRegion = createElement('div', 'chat-stage__drag-region');
  canvas.append(dragRegion, scroll, bottom);
  stage.append(canvas);
  shell.append(sidebar, stage);
  root.replaceChildren(shell);

  requestAnimationFrame(() => moveIndicatorToTab(activeTabEl, false));
  syncComposer();
  renderThread();
}

bootstrap();
