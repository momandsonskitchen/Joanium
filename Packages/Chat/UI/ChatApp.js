import en from '../I18n/en.js';
import de from '../I18n/de.js';
import fr from '../I18n/fr.js';
import { formatText, createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace, truncate } from '../../Shared/Utils/StringUtils.js';
import { createLogoLoader } from '../../Shared/LogoLoader/LogoLoader.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createTemplatesPanel } from '../../Templates/UI/TemplatesPanel.js';

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
  `,
  newChat: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  `,
  pin: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z" />
    </svg>
  `,
  pinFill: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 17v5" />
      <path fill="currentColor" stroke="none" d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z" />
    </svg>
  `,
  pencil: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  `,
  trash: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  `,
  imageUpload: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  `,
  folderOpen: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
      <path d="M3 7v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.5" />
    </svg>
  `,
  close: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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
  const startOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay      = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime())     return 'today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'yesterday';
  return 'earlier';
}

function formatSessionTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const startOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay      = new Date(date.getFullYear(), date.getMonth(), date.getDate());

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
  const payload    = await window.JoaniumChat.bootstrap();
  const strings    = getDictionary(payload.user.locale);
  const root       = document.getElementById('app');
  const firstName  = getFirstName(payload.user.profile.name, strings.appName);
  const greetingKey = getGreetingKey(new Date());

  let activeProvider   = getPreferredProvider(payload);
  let activeModel      = activeProvider?.models?.[0] ?? null;
  let activeModelLabel = activeModel?.name ?? activeProvider?.featuredModels?.[0] ?? strings.composer.modelFallback;

  // Active persona — system prompt prepended to every message.
  let activePersona = null;
  // Load Joana by default
  try {
    activePersona = await window.JoaniumChat.loadPersona('Joanium', 'Joana.md');
  } catch (err) {
    console.error('[Joanium] Failed to load default persona:', err);
  }

  let draftValue  = '';
  let isSending   = false;
  let accText     = '';
  let accThinking = '';

  // Session tracking — null means this is an unsaved new conversation.
  let sessionId          = null;
  let sessionCreatedAt   = null;

  // DOM refs set during build
  let composerField = null;
  let sendButton    = null;
  let thread        = null;
  let title         = null;
  let subtitle      = null;
  let logoEl        = null;
  let composer      = null;
  let canvas        = null;
  let scroll        = null;
  let bottom        = null;
  let newChatBtn    = null;
  let projectPill   = null;
  let projectNameEl = null;
  let projectMetaEl = null;
  let messages      = [];

  // Model picker state
  let modelPickerPanel    = null;
  let modelPickerOpen     = false;
  let modelButton         = null;

  // Tab state
  let activeTabEl       = null;
  let lastSelectedEntry = null;
  const tabElements     = {};

  // Active project context — injected as system prompt when set.
  let activeProject = null;

  // History panel — created lazily on first open.
  let historyPanel    = null;
  let projectsPanel  = null;
  let templatesPanel = null;
  let _populateTemplatesList = null;
  let skillsPanel    = null;
  let personasPanel  = null;
  let settingsPanel  = null;

  // Projects form state — shared across buildProjectsPanel and buildProjectCard
  let draftName = '';
  let draftIcon = '📁';
  let draftInfo = '';
  let draftCoverImagePath = '';
  let draftFolderPath = '';
  let editingProjectId = null;
  let editingProjectCreatedAt = null;

  // ---------------------------------------------------------------------------
  // Session persistence
  // ---------------------------------------------------------------------------

  async function saveCurrentSession() {
    if (!sessionId || messages.length === 0) return;
    const firstUser = messages.find((m) => m.role === 'user');
    if (!firstUser) return;

    const sessionTitle = truncate(collapseWhitespace(firstUser.content), 60);
    const now = new Date().toISOString();

    const sessionMessages = messages
      .filter((m) => !m.streaming && !m.pending && m.content)
      .map(({ role, content, thinking }) => {
        const entry = { role, content };
        if (thinking) entry.thinking = thinking;
        return entry;
      });

    const sessionData = {
      id:        sessionId,
      title:     sessionTitle,
      createdAt: sessionCreatedAt ?? now,
      updatedAt: now,
      messages:  sessionMessages
    };

    if (activeProject?.id) {
      sessionData.projectId = activeProject.id;
    }

    await window.JoaniumChat.saveSession(sessionData);
  }

  // ---------------------------------------------------------------------------
  // View switching — history panel replaces scroll + bottom fully.
  // ---------------------------------------------------------------------------

  function showChatView() {
    scroll.hidden = false;
    bottom.hidden = false;
    if (historyPanel)   historyPanel.hidden   = true;
    if (projectsPanel)  projectsPanel.hidden  = true;
    if (templatesPanel) templatesPanel.hidden = true;
    if (settingsPanel)  settingsPanel.hidden  = true;
    if (skillsPanel)    skillsPanel.hidden    = true;
    if (personasPanel)  personasPanel.hidden  = true;
  }

  async function showSkillsView() {
    scroll.hidden = true;
    bottom.hidden = true;
    if (historyPanel)   historyPanel.hidden   = true;
    if (projectsPanel)  projectsPanel.hidden  = true;
    if (templatesPanel) templatesPanel.hidden = true;
    if (settingsPanel)  settingsPanel.hidden  = true;
    if (personasPanel)  personasPanel.hidden  = true;

    if (!skillsPanel) {
      skillsPanel = buildSkillsPanel();
      canvas.append(skillsPanel);
    }

    skillsPanel.hidden = false;
    await populateSkillsList(skillsPanel._listEl, skillsPanel._search.getValue().trim());
  }

  async function showPersonasView() {
    scroll.hidden = true;
    bottom.hidden = true;
    if (historyPanel)   historyPanel.hidden   = true;
    if (projectsPanel)  projectsPanel.hidden  = true;
    if (templatesPanel) templatesPanel.hidden = true;
    if (settingsPanel)  settingsPanel.hidden  = true;
    if (skillsPanel)    skillsPanel.hidden    = true;

    if (!personasPanel) {
      personasPanel = buildPersonasPanel();
      canvas.append(personasPanel);
    }

    personasPanel.hidden = false;
    await populatePersonasList(personasPanel._listEl, personasPanel._search.getValue().trim());
  }

  async function showHistoryView() {
    scroll.hidden = true;
    bottom.hidden = true;
    if (settingsPanel) settingsPanel.hidden = true;

    if (!historyPanel) {
      historyPanel = buildHistoryPanel();
      canvas.append(historyPanel);
    }

    historyPanel.hidden = false;
    historyPanel._search.clear();
    await populateHistoryPanel(historyPanel._contentEl);
  }

  async function showProjectsView() {
    scroll.hidden = true;
    bottom.hidden = true;
    if (historyPanel)   historyPanel.hidden   = true;
    if (templatesPanel) templatesPanel.hidden = true;
    if (settingsPanel)  settingsPanel.hidden  = true;
    if (skillsPanel)    skillsPanel.hidden    = true;
    if (personasPanel)  personasPanel.hidden  = true;

    if (!projectsPanel) {
      projectsPanel = buildProjectsPanel();
      canvas.append(projectsPanel);
    }

    projectsPanel.hidden = false;
    await populateProjectsList(projectsPanel._listEl, projectsPanel._search.getValue().trim());
  }

  function createProjectId(name) {
    const sanitized = (name || 'Project').trim()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      || 'Project';
    const unique = Math.random().toString(36).slice(2, 7).padEnd(5, '0');
    return `${sanitized}-${unique}`;
  }

  function getProjectCoverUrl(coverImagePath) {
    const normalizedPath = collapseWhitespace(coverImagePath);
    if (!normalizedPath) return '';
    if (normalizedPath.startsWith('file://')) return normalizedPath;

    const slashPath = normalizedPath.replace(/\\/g, '/');
    if (/^[a-zA-Z]:\//.test(slashPath)) {
      return encodeURI(`file:///${slashPath}`);
    }

    return encodeURI(`file://${slashPath}`);
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

  function setActiveProject(project) {
    activeProject = project ? {
      id: project.id,
      name: project.name ?? '',
      icon: project.icon ?? '',
      info: project.info ?? '',
      coverImagePath: project.coverImagePath ?? ''
    } : null;

    syncActiveProjectPill();

    if (projectsPanel && !projectsPanel.hidden) {
      void populateProjectsList(projectsPanel._listEl, projectsPanel._search.getValue().trim());
    }
  }

  function clearActiveProject() {
    setActiveProject(null);
  }

  function syncActiveProjectPill() {
    if (!projectPill || !projectNameEl || !projectMetaEl) return;

    if (!activeProject) {
      projectPill.hidden = true;
      projectNameEl.textContent = '';
      projectMetaEl.textContent = '';
      return;
    }

    const meta = collapseWhitespace(activeProject.info)
      || strings.projects.activeHint;

    projectPill.hidden = false;
    projectNameEl.textContent = activeProject.name;
    projectMetaEl.textContent = meta;
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

    // ── Header row ────────────────────────────────────────────────────────
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

    // ── Search bar (shared component) ─────────────────────────────────────
    const searchWrap  = createElement('div', 'chat-history__search-wrap');
    const searchInner = createElement('div', 'chat-history__search-inner');

    const search = createSearchBar({
      placeholder: strings.history.search,
      onChange:    (value) => void populateHistoryPanel(contentEl, value.trim())
    });

    // Prevent Electron drag-region from swallowing input events
    search.element.style.webkitAppRegion = 'no-drag';

    searchInner.append(search.element);
    searchWrap.append(searchInner);

    // ── Session list ──────────────────────────────────────────────────────
    const contentEl = createElement('div', 'chat-history__content');

    panel.append(header, searchWrap, contentEl);
    panel._contentEl = contentEl;
    panel._search    = search;

    return panel;
  }

  async function populateHistoryPanel(contentEl, query = '') {
    // Show loading skeletons while fetching
    contentEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      contentEl.append(createElement('div', 'chat-history__skeleton'));
    }

    const allSessions = await window.JoaniumChat.listSessions(activeProject?.id);

    // Filter by query — title match, case-insensitive
    const q = query.toLowerCase();
    const sessions = q
      ? allSessions.filter((s) => (s.title ?? '').toLowerCase().includes(q))
      : allSessions;

    contentEl.replaceChildren();

    if (allSessions.length === 0) {
      const empty = createElement('div', 'chat-history__empty');
      empty.append(
        createElement('p', 'chat-history__empty-title', strings.history.empty),
        createElement('p', 'chat-history__empty-hint',  strings.history.emptyHint)
      );
      contentEl.append(empty);
      return;
    }

    if (sessions.length === 0) {
      const empty = createElement('div', 'chat-history__empty');
      empty.append(
        createElement('p', 'chat-history__empty-title', strings.history.noResults),
        createElement('p', 'chat-history__empty-hint',  strings.history.noResultsHint)
      );
      contentEl.append(empty);
      return;
    }

    // Pinned sessions go first; non-pinned are grouped by date
    const groups = { pinned: [], today: [], yesterday: [], earlier: [] };
    for (const session of sessions) {
      if (session.pinned) {
        groups.pinned.push(session);
      } else {
        groups[getSessionGroup(session.updatedAt)].push(session);
      }
    }

    const groupLabels = {
      pinned:    strings.history.pinned,
      today:     strings.history.today,
      yesterday: strings.history.yesterday,
      earlier:   strings.history.earlier
    };

    for (const [groupKey, groupSessions] of Object.entries(groups)) {
      if (groupSessions.length === 0) continue;

      const section = createElement('div', 'chat-history__section');
      section.append(createElement('div', 'chat-history__section-label', groupLabels[groupKey]));

      for (const session of groupSessions) {
        section.append(buildSessionCard(session, contentEl, query));
      }

      contentEl.append(section);
    }
  }

  function buildSessionCard(session, contentEl, query) {
    const card = createElement('div', 'chat-history__card');

    // ── Body: main click target ──────────────────────────────────────────
    const body = createElement('button', 'chat-history__card-body');
    body.type = 'button';

    const msgCount = session.messageCount ?? 0;
    const msgLabel = msgCount === 1
      ? strings.history.oneMessage
      : formatText(strings.history.messages, { count: msgCount });

    const titleEl = createElement('div', 'chat-history__card-title', session.title || strings.appName);
    const metaEl  = createElement('div', 'chat-history__card-meta', `${msgLabel} · ${formatSessionTime(session.updatedAt)}`);
    body.append(titleEl, metaEl);
    body.addEventListener('click', () => void loadHistorySession(session.id));

    // ── Actions ──────────────────────────────────────────────────────────
    const actions = createElement('div', 'chat-history__card-actions');

    // Pin / Unpin
    const pinBtn  = createElement('button', `chat-history__card-btn${session.pinned ? ' chat-history__card-btn--pinned' : ''}`);
    pinBtn.type   = 'button';
    pinBtn.setAttribute('aria-label', session.pinned ? strings.history.unpin : strings.history.pin);
    const pinIcon = createElement('span', 'chat-history__card-btn-icon');
    pinIcon.innerHTML = session.pinned ? iconMarkup.pinFill : iconMarkup.pin;
    pinBtn.append(pinIcon);
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.pinSession(session.id, !session.pinned, activeProject?.id);
      } catch (err) {
        console.error('[Joanium] Failed to pin session:', err);
      }
      await populateHistoryPanel(contentEl, query);
    });

    // Rename
    const renameBtn  = createElement('button', 'chat-history__card-btn');
    renameBtn.type   = 'button';
    renameBtn.setAttribute('aria-label', strings.history.rename);
    const renameIcon = createElement('span', 'chat-history__card-btn-icon');
    renameIcon.innerHTML = iconMarkup.pencil;
    renameBtn.append(renameIcon);
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineRename(session, titleEl, contentEl, query);
    });

    // Delete
    const deleteBtn  = createElement('button', 'chat-history__card-btn chat-history__card-btn--danger');
    deleteBtn.type   = 'button';
    deleteBtn.setAttribute('aria-label', strings.history.deleteChat);
    const deleteIcon = createElement('span', 'chat-history__card-btn-icon');
    deleteIcon.innerHTML = iconMarkup.trash;
    deleteBtn.append(deleteIcon);
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteSession(session.id, activeProject?.id);
        if (session.id === sessionId) clearConversation();
      } catch (err) {
        console.error('[Joanium] Failed to delete session:', err);
      }
      await populateHistoryPanel(contentEl, query);
    });

    actions.append(pinBtn, renameBtn, deleteBtn);
    card.append(body, actions);
    return card;
  }

  // ---------------------------------------------------------------------------
  // Projects panel DOM
  // ---------------------------------------------------------------------------

  function buildProjectsPanel() {
    const panel = createElement('div', 'chat-projects');
    panel.hidden = true;

    const header = createElement('div', 'chat-projects__header');
    const headerCopy = createElement('div', 'chat-projects__header-copy');
    headerCopy.append(
      createElement('h2', 'chat-projects__title', strings.projects.title),
      createElement('p', 'chat-projects__subtitle', strings.projects.subtitle)
    );
    header.append(headerCopy);
    panel.append(header);

    const body = createElement('div', 'chat-projects__body');
    const formCol = createElement('div', 'chat-projects__form-col');
    const formHeading = createElement('p', 'chat-projects__form-heading', strings.projects.newProjectHeading);
    formCol.append(formHeading);



    const nameRow = createElement('div', 'chat-projects__name-row');

    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.className   = 'chat-projects__name-input';
    nameInput.placeholder = strings.projects.namePlaceholder;
    nameInput.style.webkitUserSelect = 'text';
    nameInput.style.userSelect       = 'text';
    nameInput.style.cursor           = 'text';
    nameInput.addEventListener('input', (e) => {
      draftName = e.target.value;
      syncSaveBtn();
    });

    nameRow.append(nameInput);

    const folderLabel = createElement('label', 'chat-projects__info-label', strings.projects.folderLabel);
    
    const folderRow = createElement('div', 'chat-projects__folder-row');
    const folderInput = document.createElement('input');
    folderInput.type = 'text';
    folderInput.className = 'chat-projects__folder-input';
    folderInput.placeholder = strings.projects.folderPlaceholder;
    folderInput.readOnly = true;
    folderInput.style.webkitUserSelect = 'text';
    folderInput.style.userSelect = 'text';
    folderInput.style.cursor = 'text';
    
    const folderBtn = createElement('button', 'chat-projects__folder-btn');
    folderBtn.type = 'button';
    folderBtn.textContent = strings.projects.selectFolder;
    folderBtn.addEventListener('click', async () => {
      try {
        const selectedPath = await window.JoaniumChat.selectProjectDirectory();
        if (selectedPath) {
          draftFolderPath = selectedPath;
          folderInput.value = draftFolderPath;
        }
      } catch (error) {
        console.error('[Joanium] Failed to select folder:', error);
      }
    });
    
    folderRow.append(folderInput, folderBtn);

    const coverLabel = createElement('label', 'chat-projects__info-label', strings.projects.coverLabel);
    const coverZone = createElement('button', 'chat-projects__cover-zone');
    coverZone.type = 'button';
    coverZone.setAttribute('aria-label', strings.projects.coverHint);

    const coverPreview = document.createElement('img');
    coverPreview.className = 'chat-projects__cover-preview';
    coverPreview.alt = '';

    const coverPlaceholder = createElement('div', 'chat-projects__cover-placeholder');
    coverPlaceholder.append(
      createIcon('imageUpload', 'chat-projects__cover-icon'),
      createElement('span', 'chat-projects__cover-hint', strings.projects.coverHint)
    );

    const coverOverlay = createElement('div', 'chat-projects__cover-overlay');
    coverOverlay.append(
      createIcon('imageUpload', 'chat-projects__cover-icon'),
      createElement('span', 'chat-projects__cover-hint', strings.projects.changeCover)
    );

    coverZone.append(coverPreview, coverPlaceholder, coverOverlay);

    function syncCoverZone() {
      const coverUrl = getProjectCoverUrl(draftCoverImagePath);
      coverZone.classList.toggle('chat-projects__cover-zone--filled', Boolean(coverUrl));
      coverPreview.src = coverUrl;
    }

    coverZone.addEventListener('click', async () => {
      try {
        const selectedPath = await window.JoaniumChat.selectProjectCover();
        if (!selectedPath) return;
        draftCoverImagePath = selectedPath;
        syncCoverZone();
      } catch (error) {
        console.error('[Joanium] Failed to select project cover:', error);
      }
    });

    const infoLabel = createElement('label', 'chat-projects__info-label', strings.projects.infoLabel);

    const infoTextarea = document.createElement('textarea');
    infoTextarea.className   = 'chat-projects__info-textarea';
    infoTextarea.placeholder = strings.projects.infoPlaceholder;
    infoTextarea.rows        = 5;
    infoTextarea.style.webkitUserSelect = 'text';
    infoTextarea.style.userSelect       = 'text';
    infoTextarea.style.cursor           = 'text';
    infoTextarea.addEventListener('input', (e) => { draftInfo = e.target.value; });

    const formActions = createElement('div', 'chat-projects__form-actions');

    const cancelBtn  = createElement('button', 'chat-projects__btn-cancel');
    cancelBtn.type   = 'button';
    cancelBtn.textContent = strings.projects.cancel;

    const saveBtn  = createElement('button', 'chat-projects__btn-save');
    saveBtn.type   = 'button';
    saveBtn.disabled = true;
    saveBtn.textContent = strings.projects.save;

    function syncSaveBtn() {
      saveBtn.disabled = !draftName.trim();
    }

    function syncFormChrome() {
      formHeading.textContent = editingProjectId
        ? strings.projects.editProjectHeading
        : strings.projects.newProjectHeading;
      saveBtn.textContent = editingProjectId
        ? strings.projects.update
        : strings.projects.save;
    }

    function resetProjectForm() {
      editingProjectId = null;
      editingProjectCreatedAt = null;
      draftName = '';
      draftIcon = '📁';
      draftInfo = '';
      draftCoverImagePath = '';
      draftFolderPath = '';
      nameInput.value = '';
      folderInput.value = '';
      infoTextarea.value = '';
      syncCoverZone();
      syncFormChrome();
      syncSaveBtn();
    }

    function applyProjectToForm(project) {
      editingProjectId = project.id;
      editingProjectCreatedAt = project.createdAt ?? null;
      draftName = project.name ?? '';
      draftIcon = project.icon ?? '📁';
      draftInfo = project.info ?? '';
      draftCoverImagePath = project.coverImagePath ?? '';
      draftFolderPath = project.folderPath ?? '';
      nameInput.value = draftName;
      folderInput.value = draftFolderPath;
      infoTextarea.value = draftInfo;
      syncCoverZone();
      syncFormChrome();
      syncSaveBtn();
      nameInput.focus();
      nameInput.select();
    }

    saveBtn.addEventListener('click', async () => {
      const name = draftName.trim();
      if (!name) return;

      const now = new Date().toISOString();

      const project = {
        id: editingProjectId ?? createProjectId(name),
        name,
        icon: draftIcon,
        info: draftInfo.trim(),
        folderPath: draftFolderPath.trim(),
        coverImagePath: draftCoverImagePath.trim(),
        createdAt: editingProjectCreatedAt ?? now,
        updatedAt: now
      };

      try {
        await window.JoaniumChat.saveProject(project);
      } catch (err) {
        console.error('[Joanium] Failed to save project:', err);
        return;
      }

      if (activeProject?.id === project.id) {
        setActiveProject(project);
      }

      resetProjectForm();
      await populateProjectsList(panel._listEl, panel._search.getValue().trim());
    });

    cancelBtn.addEventListener('click', resetProjectForm);

    formActions.append(cancelBtn, saveBtn);
    const formCard = createElement('div', 'chat-projects__form-card');
    formCard.append(
      nameRow,
      folderLabel,
      folderRow,
      coverLabel,
      coverZone,
      infoLabel,
      infoTextarea,
      formActions
    );
    formCol.append(formCard);

    const listCol = createElement('div', 'chat-projects__list-col');
    listCol.append(createElement('p', 'chat-projects__list-heading', strings.projects.yourProjects));

    const searchWrap = createElement('div', 'chat-projects__list-search');
    const search = createSearchBar({
      placeholder: strings.projects.searchPlaceholder,
      onChange: (value) => void populateProjectsList(listContent, value.trim())
    });
    search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(search.element);

    const listContent = createElement('div', 'chat-projects__list-content');
    listCol.append(searchWrap, listContent);

    body.append(formCol, listCol);
    panel.append(body);

    panel._listEl = listContent;
    panel._search = search;
    panel._startEdit = applyProjectToForm;
    panel._resetForm = resetProjectForm;
    syncFormChrome();
    syncCoverZone();
    return panel;
  }

  async function populateProjectsList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'chat-projects__skeleton'));
    }

    let projects;
    try {
      projects = await window.JoaniumChat.listProjects();
    } catch {
      projects = [];
    }

    const normalizedQuery = collapseWhitespace(query).toLowerCase();
    const filteredProjects = normalizedQuery
      ? projects.filter((project) => {
          const haystack = [
            project.name,
            project.info
          ]
            .map((value) => collapseWhitespace(value).toLowerCase())
            .join('\n');
          return haystack.includes(normalizedQuery);
        })
      : projects;

    listEl.replaceChildren();

    if (filteredProjects.length === 0) {
      const empty = createElement('div', 'chat-projects__empty');
      empty.append(
        createElement(
          'p',
          'chat-projects__empty-title',
          normalizedQuery ? strings.projects.noResults : strings.projects.empty
        ),
        createElement(
          'p',
          'chat-projects__empty-hint',
          normalizedQuery ? strings.projects.noResultsHint : strings.projects.emptyHint
        )
      );
      listEl.append(empty);
      return;
    }

    for (const project of filteredProjects) {
      listEl.append(buildProjectCard(project, listEl));
    }
  }

  function buildProjectCard(project, listEl) {
    const isActiveProject = activeProject?.id === project.id;
    const card = createElement(
      'div',
      `chat-projects__card${isActiveProject ? ' chat-projects__card--active' : ''}`
    );

    const coverUrl = getProjectCoverUrl(project.coverImagePath);
    const iconEl = createElement(
      'div',
      `chat-projects__card-icon${coverUrl ? ' chat-projects__card-icon--image' : ''}`,
      coverUrl ? '' : (project.icon || '📁')
    );

    if (coverUrl) {
      const coverImage = document.createElement('img');
      coverImage.className = 'chat-projects__card-cover-img';
      coverImage.src = coverUrl;
      coverImage.alt = '';
      iconEl.append(coverImage);
    }

    const body    = createElement('div', 'chat-projects__card-body');
    const nameEl  = createElement('div', 'chat-projects__card-name', project.name);
    const dateStr = new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const metaWrap = createElement('div', 'chat-projects__card-meta-wrap');
    metaWrap.append(
      createElement('div', 'chat-projects__card-meta', formatText(strings.projects.created, { date: dateStr }))
    );

    body.append(nameEl, metaWrap);

    async function openProject() {
      let fullProject;
      try {
        fullProject = await window.JoaniumChat.loadProject(project.id);
      } catch (error) {
        console.error('[Joanium] Failed to load project:', error);
        return;
      }

      setActiveProject(fullProject);
      clearConversation();
      switchToTab('chat');
      showChatView();
      focusComposer();
    }

    const openBtn  = createElement(
      'button',
      `chat-projects__open-btn${isActiveProject ? ' chat-projects__open-btn--active' : ''}`
    );
    openBtn.type   = 'button';
    openBtn.textContent = isActiveProject ? strings.projects.active : strings.projects.open;
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      void openProject();
    });

    const actions   = createElement('div', 'chat-projects__card-actions');

    const editBtn = createElement('button', 'chat-projects__card-btn');
    editBtn.type = 'button';
    editBtn.setAttribute('aria-label', strings.projects.edit);
    editBtn.append(createIcon('pencil', 'chat-projects__card-btn-icon'));
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const fullProject = await window.JoaniumChat.loadProject(project.id);
        projectsPanel?._startEdit(fullProject);
      } catch (error) {
        console.error('[Joanium] Failed to load project for editing:', error);
      }
    });

    const deleteBtn = createElement('button', 'chat-projects__card-btn chat-projects__card-btn--danger');
    deleteBtn.type  = 'button';
    deleteBtn.setAttribute('aria-label', strings.projects.delete);
    deleteBtn.append(createIcon('trash', 'chat-projects__card-btn-icon'));
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteProject(project.id);
      } catch (error) {
        console.error('[Joanium] Failed to delete project:', error);
      }

      if (activeProject?.id === project.id) {
        clearActiveProject();
      }

      if (editingProjectId === project.id) {
        projectsPanel?._resetForm();
      }

      await populateProjectsList(listEl, projectsPanel?._search.getValue().trim() ?? '');
    });

    actions.append(editBtn, deleteBtn);
    card.addEventListener('click', () => {
      void openProject();
    });
    card.append(iconEl, body, openBtn, actions);
    return card;
  }

  // ---------------------------------------------------------------------------
  // Templates panel DOM
  // ---------------------------------------------------------------------------

  async function showTemplatesView() {
    scroll.hidden = true;
    bottom.hidden = true;
    if (historyPanel)  historyPanel.hidden  = true;
    if (projectsPanel) projectsPanel.hidden = true;
    if (settingsPanel) settingsPanel.hidden = true;
    if (skillsPanel)   skillsPanel.hidden   = true;
    if (personasPanel) personasPanel.hidden = true;

    if (!templatesPanel) {
      const tpl = createTemplatesPanel(strings.templates);
      templatesPanel = tpl.build();
      _populateTemplatesList = tpl.populateList;
      canvas.append(templatesPanel);
    }

    templatesPanel.hidden = false;
    await _populateTemplatesList(templatesPanel._listEl, templatesPanel._search.getValue().trim());
  }


  // ---------------------------------------------------------------------------
  // Skills panel DOM
  // ---------------------------------------------------------------------------

  function buildSkillsPanel() {
    const panel = createElement('div', 'chat-skills');
    panel.hidden = true;

    const header = createElement('div', 'chat-skills__header');
    header.append(
      createElement('h2', 'chat-skills__title', strings.skills.title),
      createElement('p', 'chat-skills__subtitle', strings.skills.subtitle)
    );
    panel.append(header);

    const body = createElement('div', 'chat-skills__body');

    // Left column: list
    const listCol = createElement('div', 'chat-skills__list-col');
    const searchWrap = createElement('div', 'chat-skills__list-search');
    const search = createSearchBar({
      placeholder: strings.skills.searchPlaceholder,
      onChange: (value) => void populateSkillsList(listContent, value.trim())
    });
    search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(search.element);

    const listContent = createElement('div', 'chat-skills__list-content');
    listCol.append(searchWrap, listContent);

    // Right column: viewer
    const viewerCol = createElement('div', 'chat-skills__viewer-col');
    const viewerCard = createElement('div', 'chat-skills__viewer-card');
    viewerCard.append(createElement('div', 'chat-skills__viewer-empty', 'Select a skill to read its content'));
    viewerCol.append(viewerCard);

    body.append(listCol, viewerCol);
    panel.append(body);

    panel._listEl = listContent;
    panel._search = search;
    panel._viewerEl = viewerCard;
    return panel;
  }

  async function populateSkillsList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'chat-skills__skeleton'));
    }

    let skills;
    try {
      skills = await window.JoaniumChat.listSkills();
    } catch {
      skills = [];
    }

    const q = query.toLowerCase();
    const filtered = q
      ? skills.filter(s => 
          s.name.toLowerCase().includes(q) || 
          s.description.toLowerCase().includes(q) || 
          s.namespace.toLowerCase().includes(q)
        )
      : skills;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-skills__empty');
      empty.append(
        createElement('p', 'chat-skills__empty-title', q ? strings.skills.noResults : strings.skills.empty),
        createElement('p', 'chat-skills__empty-hint', q ? strings.skills.noResultsHint : strings.skills.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const skill of filtered) {
      listEl.append(buildSkillCard(skill, listEl));
    }
  }

  async function populateSkillViewer(skill) {
    const viewerEl = skillsPanel?._viewerEl;
    if (!viewerEl) return;

    let fullSkill;
    try {
      fullSkill = await window.JoaniumChat.loadSkill(skill.namespace, skill.filename);
    } catch (err) {
      console.error('[Joanium] Failed to load skill for viewer:', err);
      return;
    }

    viewerEl.replaceChildren();

    const header = createElement('div', 'chat-skills__viewer-header');
    const title = createElement('h3', 'chat-skills__viewer-title', fullSkill.name);
    const author = createElement('div', 'chat-skills__viewer-author');
    author.append(
      createElement('span', 'chat-skills__viewer-author-label', 'Author'),
      createElement('span', 'chat-skills__viewer-author-value', fullSkill.namespace)
    );
    header.append(title, author);

    const meta = createElement('div', 'chat-skills__viewer-meta');
    if (fullSkill.trigger) {
      const trigger = createElement('div', 'chat-skills__viewer-trigger');
      trigger.append(
        createElement('span', 'chat-skills__viewer-trigger-label', strings.skills.trigger),
        createElement('span', 'chat-skills__viewer-trigger-value', fullSkill.trigger)
      );
      meta.append(trigger);
    }
    
    const content = createElement('div', 'chat-skills__viewer-content');
    content.append(createElement('pre', 'chat-skills__viewer-pre', fullSkill.content));

    viewerEl.append(header, meta, content);
  }

  function buildSkillCard(skill, listEl) {
    const card = createElement('div', 'chat-skills__card');
    card.addEventListener('click', () => {
      listEl.querySelectorAll('.chat-skills__card--active').forEach(el => el.classList.remove('chat-skills__card--active'));
      card.classList.add('chat-skills__card--active');
      void populateSkillViewer(skill);
    });

    const body = createElement('div', 'chat-skills__card-body');
    body.append(createElement('span', 'chat-skills__card-name', skill.name));
    if (skill.description) {
      body.append(createElement('div', 'chat-skills__card-desc', skill.description));
    }

    const actions = createElement('div', 'chat-skills__card-actions');
    const deleteBtn = createElement('button', 'chat-skills__card-btn chat-skills__card-btn--danger');
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', strings.skills.delete);
    deleteBtn.append(createIcon('trash', 'chat-skills__card-btn-icon'));
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteSkill(skill.namespace, skill.filename);
        await populateSkillsList(listEl, skillsPanel._search.getValue().trim());
      } catch (err) {
        console.error('[Joanium] Failed to delete skill:', err);
      }
    });

    actions.append(deleteBtn);
    card.append(body, actions);
    return card;
  }

  // ---------------------------------------------------------------------------
  // Personas panel DOM
  // ---------------------------------------------------------------------------

  function buildPersonasPanel() {
    const panel = createElement('div', 'chat-personas');
    panel.hidden = true;

    const header = createElement('div', 'chat-personas__header');
    header.append(
      createElement('h2', 'chat-personas__title', strings.personas.title),
      createElement('p', 'chat-personas__subtitle', strings.personas.subtitle)
    );
    panel.append(header);

    const body = createElement('div', 'chat-personas__body');

    // Left column: list
    const listCol = createElement('div', 'chat-personas__list-col');
    const searchWrap = createElement('div', 'chat-personas__list-search');
    const search = createSearchBar({
      placeholder: strings.personas.searchPlaceholder,
      onChange: (value) => void populatePersonasList(listContent, value.trim())
    });
    search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(search.element);

    const listContent = createElement('div', 'chat-personas__list-content');
    listCol.append(searchWrap, listContent);

    // Right column: viewer
    const viewerCol = createElement('div', 'chat-personas__viewer-col');
    const viewerCard = createElement('div', 'chat-personas__viewer-card');
    viewerCard.append(createElement('div', 'chat-personas__viewer-empty', 'Select a persona to read its content'));
    viewerCol.append(viewerCard);

    body.append(listCol, viewerCol);
    panel.append(body);

    panel._listEl = listContent;
    panel._search = search;
    panel._viewerEl = viewerCard;
    return panel;
  }

  async function populatePersonasList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'chat-personas__skeleton'));
    }

    let personas;
    try {
      personas = await window.JoaniumChat.listPersonas();
    } catch {
      personas = [];
    }

    const q = query.toLowerCase();
    const filtered = q
      ? personas.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q) || 
          p.namespace.toLowerCase().includes(q)
        )
      : personas;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-personas__empty');
      empty.append(
        createElement('p', 'chat-personas__empty-title', q ? strings.personas.noResults : strings.personas.empty),
        createElement('p', 'chat-personas__empty-hint', q ? strings.personas.noResultsHint : strings.personas.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const persona of filtered) {
      listEl.append(buildPersonaCard(persona, listEl));
    }
  }

  async function populatePersonaViewer(persona) {
    const viewerEl = personasPanel?._viewerEl;
    if (!viewerEl) return;

    let fullPersona;
    try {
      fullPersona = await window.JoaniumChat.loadPersona(persona.namespace, persona.filename);
    } catch (err) {
      console.error('[Joanium] Failed to load persona for viewer:', err);
      return;
    }

    viewerEl.replaceChildren();

    const isActive = activePersona?.id === persona.id;

    const header = createElement('div', 'chat-personas__viewer-header');
    const title = createElement('h3', 'chat-personas__viewer-title', fullPersona.name);
    const author = createElement('div', 'chat-personas__viewer-author');
    author.append(
      createElement('span', 'chat-personas__viewer-author-label', 'Author'),
      createElement('span', 'chat-personas__viewer-author-value', fullPersona.namespace)
    );
    header.append(title, author);

    if (fullPersona.protected) {
      const badge = createElement('span', 'chat-personas__viewer-badge', strings.personas.protected);
      header.append(badge);
    }

    const actions = createElement('div', 'chat-personas__viewer-actions');
    const activateBtn = createElement('button', `chat-personas__viewer-activate${isActive ? ' chat-personas__viewer-activate--active' : ''}`);
    activateBtn.type = 'button';
    activateBtn.textContent = isActive ? strings.personas.active : strings.personas.activate;
    activateBtn.addEventListener('click', async () => {
      if (isActive) {
        activePersona = null;
      } else {
        activePersona = fullPersona;
      }
      void populatePersonaViewer(persona);
      void populatePersonasList(personasPanel._listEl, personasPanel._search.getValue().trim());
    });
    actions.append(activateBtn);
    
    const content = createElement('div', 'chat-personas__viewer-content');
    content.append(createElement('pre', 'chat-personas__viewer-pre', fullPersona.content));

    viewerEl.append(header, actions, content);
  }

  function buildPersonaCard(persona, listEl) {
    const isActive = activePersona?.id === persona.id;
    const card = createElement('div', `chat-personas__card${isActive ? ' chat-personas__card--active' : ''}`);
    card.addEventListener('click', () => {
      listEl.querySelectorAll('.chat-personas__card--selected').forEach(el => el.classList.remove('chat-personas__card--selected'));
      card.classList.add('chat-personas__card--selected');
      void populatePersonaViewer(persona);
    });

    const body = createElement('div', 'chat-personas__card-body');
    const nameRow = createElement('div', 'chat-personas__card-name-row');
    nameRow.append(createElement('span', 'chat-personas__card-name', persona.name));
    if (persona.protected) {
      nameRow.append(createElement('span', 'chat-personas__card-badge', strings.personas.protected));
    }
    body.append(nameRow);
    if (persona.description) {
      body.append(createElement('div', 'chat-personas__card-desc', persona.description));
    }

    const actions = createElement('div', 'chat-personas__card-actions');
    
    if (!persona.protected) {
      const deleteBtn = createElement('button', 'chat-personas__card-btn chat-personas__card-btn--danger');
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('aria-label', strings.personas.delete);
      deleteBtn.append(createIcon('trash', 'chat-personas__card-btn-icon'));
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await window.JoaniumChat.deletePersona(persona.namespace, persona.filename);
          if (activePersona?.id === persona.id) activePersona = null;
          await populatePersonasList(listEl, personasPanel._search.getValue().trim());
        } catch (err) {
          console.error('[Joanium] Failed to delete persona:', err);
        }
      });
      actions.append(deleteBtn);
    }

    card.append(body, actions);
    return card;
  }

  function startInlineRename(session, titleEl, contentEl, query) {
    const input = document.createElement('input');
    input.className = 'chat-history__card-title-input';
    input.type      = 'text';
    input.value     = session.title || '';
    input.style.webkitAppRegion = 'no-drag';
    input.style.webkitUserSelect = 'text';
    input.style.userSelect = 'text';
    input.style.cursor = 'text';

    let committed = false;

    const finish = async (save) => {
      if (committed) return;
      committed = true;
      input.removeEventListener('blur', blurHandler);
      const newTitle = input.value.trim();
      if (save && newTitle && newTitle !== session.title) {
        try {
          await window.JoaniumChat.renameSession(session.id, newTitle, activeProject?.id);
        } catch (err) {
          console.error('[Joanium] Failed to rename session:', err);
        }
      }
      await populateHistoryPanel(contentEl, query);
    };

    const blurHandler = () => void finish(true);
    input.addEventListener('blur', blurHandler);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); void finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); void finish(false); }
    });

    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  async function loadHistorySession(id) {
    try {
      const session = await window.JoaniumChat.loadSession(id, activeProject?.id);

      messages = (session.messages ?? [])
        .map((m) => ({
          role:      m.role === 'assistant' ? 'assistant' : 'user',
          content:   typeof m.content === 'string' ? m.content : '',
          thinking:  m.thinking ?? '',
          streaming: false
        }))
        .filter((m) => m.content);

      // Restore session context so new messages append to the same file
      sessionId        = session.id;
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
        providers:           payload.providers,
        userProviderDetails: payload.user?.providers?.details ?? {},
        onSelect(provider, model) {
          activeProvider   = provider;
          activeModel      = model;
          activeModelLabel = model.name ?? model.id;
          const labelEl    = triggerButton.querySelector('.chat-composer__model-label');
          if (labelEl) labelEl.textContent = activeModelLabel;
          syncPickerActiveStates();
          closeModelPicker();
        }
      });
      modelPickerPanel = picker.element;
    }

    syncPickerActiveStates();
    modelPickerOpen = true;
    modelButton.classList.add('chat-composer__model--open');
    const rect = triggerButton.getBoundingClientRect();
    modelPickerPanel.style.left   = `${rect.left}px`;
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
        role:          'assistant',
        content,
        thinking:      accThinking,
        streaming:     false,
        stopped:       true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel:    activeModelLabel
      };
    });
    accText     = '';
    accThinking = '';
    isSending   = false;
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

    const iconEl  = sendButton.querySelector('.chat-composer__send-icon');
    const labelEl = sendButton.querySelector('.chat-composer__send-label');

    if (isSending) {
      sendButton.disabled = false;
      sendButton.classList.add('chat-composer__send--stop');
      if (iconEl)  iconEl.innerHTML    = iconMarkup.stop;
      if (labelEl) { labelEl.textContent = strings.composer.stop; labelEl.hidden = false; }
    } else {
      sendButton.disabled = !draftValue.trim();
      sendButton.classList.remove('chat-composer__send--stop');
      if (iconEl)  iconEl.innerHTML    = iconMarkup.send;
      if (labelEl) { labelEl.textContent = ''; labelEl.hidden = true; }
    }
  }

  function focusComposer() {
    if (!composerField) return;
    composerField.focus();
    composerField.setSelectionRange(draftValue.length, draftValue.length);
  }

  function clearConversation() {
    messages         = [];
    draftValue       = '';
    isSending        = false;
    sessionId        = null;
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
    logoEl.hidden   = hasMessages;
    title.hidden    = hasMessages;
    thread.hidden   = !hasMessages;
    if (subtitle) subtitle.hidden = hasMessages;
    if (newChatBtn) newChatBtn.hidden = !hasMessages;
    composer.classList.toggle('chat-composer--conversation',        hasMessages);
    scroll.classList.toggle('chat-stage__scroll--conversation',     hasMessages);
    bottom.classList.toggle('chat-stage__bottom--conversation',     hasMessages);

    if (!hasMessages) { thread.replaceChildren(); return; }

    thread.replaceChildren(...messages.map((message, index) => {
      const onCopy  = () => navigator.clipboard.writeText(message.content ?? '').catch(() => {});
      const onRetry = () => {
        if (isSending) return;
        const userIndex   = message.role === 'user' ? index : index - 1;
        if (userIndex < 0) return;
        const userMessage = messages[userIndex];
        if (!userMessage?.content) return;
        messages   = messages.slice(0, userIndex);
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
      sessionId        = generateSessionId();
      sessionCreatedAt = new Date().toISOString();
    }

    messages = [
      ...messages,
      { role: 'user', content: prompt },
      { role: 'assistant', content: '', thinking: '', streaming: true,
        providerLabel: activeProvider?.label ?? 'AI', modelLabel: activeModelLabel }
    ];

    draftValue      = '';
    isSending       = true;
    accText         = '';
    accThinking     = '';
    lastSelectedEntry = null;
    syncComposer();
    renderThread();
    focusComposer();

    window.JoaniumChat.removeStreamListeners();

    window.JoaniumChat.onStreamChunk((chunk) => {
      if (chunk?.type === 'text'     && chunk.text) accText     += chunk.text;
      if (chunk?.type === 'thinking' && chunk.text) accThinking += chunk.text;
      updateLastStreamingMessage(thread, { content: accText, thinking: accThinking });
    });

    window.JoaniumChat.onStreamDone((meta) => {
      window.JoaniumChat.removeStreamListeners();
      messages = messages.map((m, i) => i !== messages.length - 1 ? m : {
        role:          'assistant',
        content:       accText || 'No response received.',
        thinking:      accThinking,
        streaming:     false,
        providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
        modelLabel:    meta?.modelLabel    ?? activeModelLabel
      });
      isSending = false;
      void saveCurrentSession();
      syncComposer();
      renderThread();
    });

    window.JoaniumChat.onStreamError((err) => {
      window.JoaniumChat.removeStreamListeners();
      messages = messages.map((m, i) => i !== messages.length - 1 ? m : {
        role:          'assistant',
        content:       err?.message || 'Unable to get a response right now.',
        thinking:      accThinking,
        streaming:     false,
        error:         true,
        providerLabel: activeProvider?.label ?? 'AI',
        modelLabel:    activeModelLabel
      });
      isSending = false;
      syncComposer();
      renderThread();
    });

    const historyToSend = messages.slice(0, -1).map(({ role, content }) => ({ role, content }));
    void window.JoaniumChat.streamMessage({
      messages:    historyToSend,
      providerId:  activeProvider?.id ?? null,
      modelId:     activeModel?.id    ?? null,
      projectInfo: buildProjectContext(activeProject) || null,
      persona:     activePersona?.content || null
    });
  }

  // ---------------------------------------------------------------------------
  // Settings panel — shown when the user clicks their avatar.
  // ---------------------------------------------------------------------------

  function showSettingsView() {
    scroll.hidden = true;
    bottom.hidden = true;
    if (historyPanel)   historyPanel.hidden   = true;
    if (projectsPanel)  projectsPanel.hidden  = true;
    if (templatesPanel) templatesPanel.hidden = true;
    if (skillsPanel)    skillsPanel.hidden    = true;
    if (personasPanel)  personasPanel.hidden  = true;

    if (!settingsPanel) {
      settingsPanel = buildSettingsPanel();
      canvas.append(settingsPanel);
    }

    settingsPanel.hidden = false;
  }

  function buildSettingsPanel() {
    const panel = createElement('div', 'chat-settings');
    panel.hidden = true;

    // ── Top header (mirrors .chat-projects__header) ────────────────────────────
    const header = createElement('div', 'chat-settings__header');
    header.append(createElement('h2', 'chat-settings__title', 'Settings'));
    panel.append(header);

    // ── Body: left nav + right content ──────────────────────────────────
    const body = createElement('div', 'chat-settings__body');

    // Left nav column
    const nav = createElement('nav', 'chat-settings__nav');
    const navItems = createElement('div', 'chat-settings__nav-items');

    const subMenus = [
      {
        id: 'user',
        label: 'User',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
      },
      {
        id: 'about',
        label: 'About',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
      }
    ];

    // Right content column
    const main = createElement('div', 'chat-settings__main');

    function activateSubMenu(id) {
      navItems.querySelectorAll('.chat-settings__nav-item').forEach((item) => {
        item.classList.toggle('chat-settings__nav-item--active', item.dataset.subId === id);
      });
      main.replaceChildren();
      if (id === 'user')  main.append(buildUserView());
      if (id === 'about') main.append(buildAboutView());
    }

    for (const menu of subMenus) {
      const item = createElement('button', 'chat-settings__nav-item');
      item.type = 'button';
      item.dataset.subId = menu.id;
      const iconEl = createElement('span', 'chat-settings__nav-item-icon');
      iconEl.innerHTML = menu.icon;
      item.append(iconEl, createElement('span', 'chat-settings__nav-item-label', menu.label));
      item.addEventListener('click', () => activateSubMenu(menu.id));
      navItems.append(item);
    }

    nav.append(navItems);
    body.append(nav, main);
    panel.append(body);

    activateSubMenu('user');
    return panel;
  }

  function buildUserView() {
    const dob = payload.user.profile.dateOfBirth ?? {};
    let draft = {
      name: payload.user.profile.name ?? '',
      day:   dob.day   ?? '',
      month: dob.month ?? '',
      year:  dob.year  ?? ''
    };

    const view = createElement('div', 'chat-settings__user');

    // ── Name field ──────────────────────────────────────────────────────────
    const nameLabel = createElement('label', 'chat-settings__field-label', 'Name');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'chat-settings__field-input';
    nameInput.value = draft.name;
    nameInput.placeholder = 'Your full name';
    nameInput.style.webkitUserSelect = 'text';
    nameInput.style.userSelect = 'text';
    nameInput.style.cursor = 'text';
    nameInput.addEventListener('input', (e) => { draft.name = e.target.value; });

    // ── Date of birth row ───────────────────────────────────────────────────
    const dobLabel = createElement('label', 'chat-settings__field-label', 'Date of Birth');
    const dobRow = createElement('div', 'chat-settings__dob-row');

    function makeDobInput(placeholder, maxLen, currentVal, onUpdate) {
      const el = document.createElement('input');
      el.type = 'text';
      el.inputMode = 'numeric';
      el.className = 'chat-settings__dob-input';
      el.placeholder = placeholder;
      el.maxLength = maxLen;
      el.value = currentVal;
      el.style.webkitUserSelect = 'text';
      el.style.userSelect = 'text';
      el.style.cursor = 'text';
      el.addEventListener('input', (e) => { onUpdate(e.target.value.replace(/\D/g, '')); e.target.value = e.target.value.replace(/\D/g, ''); });
      return el;
    }

    const dayInput   = makeDobInput('DD',   2, draft.day,   (v) => { draft.day   = v; });
    const monthInput = makeDobInput('MM',   2, draft.month, (v) => { draft.month = v; });
    const yearInput  = makeDobInput('YYYY', 4, draft.year,  (v) => { draft.year  = v; });
    dobRow.append(dayInput, monthInput, yearInput);

    // ── Save button ─────────────────────────────────────────────────────────
    const status = createElement('p', 'chat-settings__save-status', '');
    const saveBtn = createElement('button', 'chat-settings__save-btn', 'Save Changes');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      status.textContent = '';
      try {
        await window.JoaniumChat.saveProfile({
          name: draft.name.trim(),
          dateOfBirth: { day: draft.day, month: draft.month, year: draft.year }
        });
        payload.user.profile.name = draft.name.trim();
        payload.user.profile.dateOfBirth = { day: draft.day, month: draft.month, year: draft.year };
        status.textContent = 'Saved!';
        status.className = 'chat-settings__save-status chat-settings__save-status--ok';
      } catch {
        status.textContent = 'Failed to save.';
        status.className = 'chat-settings__save-status chat-settings__save-status--err';
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
        setTimeout(() => { status.textContent = ''; status.className = 'chat-settings__save-status'; }, 3000);
      }
    });

    const actions = createElement('div', 'chat-settings__user-actions');
    actions.append(saveBtn, status);

    view.append(nameLabel, nameInput, dobLabel, dobRow, actions);
    return view;
  }

  function buildAboutView() {
    const view = createElement('div', 'chat-profile__about');

    const nameEl    = createElement('h1', 'chat-profile__about-name', strings.appName);
    const versionEl = createElement('p',  'chat-profile__about-version', 'Version 2026.430.1');
    const descEl    = createElement('p',  'chat-profile__about-desc',
      'Local-first AI desktop assistant with multi-model chat, automations, agents, MCP, and real integrations. Works with Anthropic, OpenAI, Gemini, Ollama and more.');

    const metaCard = createElement('div', 'chat-profile__about-meta');
    for (const { label, value } of [
      { label: 'Author',    value: 'Joel Jolly'   },
      { label: 'License',   value: 'Apache-2.0'   },
      { label: 'Framework', value: 'Electron 41'  }
    ]) {
      const row = createElement('div', 'chat-profile__about-meta-row');
      row.append(
        createElement('span', 'chat-profile__about-meta-label', label),
        createElement('span', 'chat-profile__about-meta-value', value)
      );
      metaCard.append(row);
    }

    view.append(nameEl, versionEl, descEl, metaCard);

    const sponsorBtn = createElement('a', 'chat-profile__about-sponsor');
    sponsorBtn.textContent = '♥ Sponsor';
    sponsorBtn.href = '#';
    sponsorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.JoaniumChat.openExternal('https://github.com/sponsors/withinjoel');
    });
    view.append(sponsorBtn);

    return view;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM construction
  // ═══════════════════════════════════════════════════════════════════════════

  const shell = createElement('main', 'chat-shell');

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar     = createElement('nav', 'chat-sidebar');
  const sidebarTabs = createElement('div', 'chat-sidebar__tabs');
  const tabIndicator = createElement('div', 'chat-sidebar__indicator');
  sidebarTabs.append(tabIndicator);

  function moveIndicatorToTab(tabEl, animate) {
    if (!tabEl) return;
    if (!animate) tabIndicator.style.transition = 'none';
    const tabsRect = sidebarTabs.getBoundingClientRect();
    const tabRect  = tabEl.getBoundingClientRect();
    tabIndicator.style.top    = `${tabRect.top - tabsRect.top}px`;
    tabIndicator.style.height = `${tabRect.height}px`;
    if (!animate) {
      tabIndicator.offsetHeight;
      tabIndicator.style.transition = '';
    }
  }

  for (const [id, label] of Object.entries(strings.tabs)) {
    const isActive = id === 'chat';
    const iconKey  = `tab${id.charAt(0).toUpperCase()}${id.slice(1)}`;
    const tab      = createElement('button', `chat-sidebar__tab${isActive ? ' chat-sidebar__tab--active' : ''}`);
    tab.type = 'button';
    tab.setAttribute('aria-label', label);
    const iconEl = createElement('span', 'chat-sidebar__tab-icon');
    iconEl.innerHTML = iconMarkup[iconKey] ?? '';
    tab.append(iconEl);
    if (isActive) activeTabEl = tab;

    tabElements[id] = tab;

    tab.addEventListener('click', () => {
      if (tab === activeTabEl) {
        if (id === 'chat') clearConversation();
        return;
      }

      activeTabEl?.classList.remove('chat-sidebar__tab--active');
      tab.classList.add('chat-sidebar__tab--active');
      activeTabEl = tab;
      moveIndicatorToTab(tab, true);

      if (id === 'chat') {
        showChatView();
      } else if (id === 'history') {
        void showHistoryView();
      } else if (id === 'projects') {
        void showProjectsView();
      } else if (id === 'templates') {
        void showTemplatesView();
      } else if (id === 'skills') {
        void showSkillsView();
      } else if (id === 'personas') {
        void showPersonasView();
      }
    });

    sidebarTabs.append(tab);
  }

  const sidebarAvatar = createElement('button', 'chat-sidebar__avatar');
  sidebarAvatar.type = 'button';
  sidebarAvatar.setAttribute('aria-label', strings.profile);
  sidebarAvatar.append(createElement('span', 'chat-sidebar__avatar-initials', getInitials(payload.user.profile.name)));

  sidebarAvatar.addEventListener('click', () => {
    if (settingsPanel && !settingsPanel.hidden) {
      showChatView();
    } else {
      showSettingsView();
    }
  });

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

  subtitle = createElement('p', 'chat-stage__subtitle', strings.heroSubtitle);
  thread   = createElement('section', 'chat-thread');
  thread.hidden = true;

  composer      = createElement('section', 'chat-composer');
  projectPill   = createElement('div', 'chat-composer__project');
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
  composerField.className   = 'chat-composer__field';
  composerField.placeholder = strings.composer.placeholder;
  composerField.rows        = 1;
  composerField.addEventListener('input', (e) => {
    draftValue        = e.target.value;
    lastSelectedEntry = null;
    syncComposerFieldHeight();
    syncComposer();
  });
  composerField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitPrompt(); }
  });

  const composerFooter  = createElement('div', 'chat-composer__footer');
  const composerActions = createElement('div', 'chat-composer__actions');
  const attachBtn       = createElement('button', 'chat-composer__icon-button');
  attachBtn.type = 'button';
  attachBtn.append(createIcon('paperclip', 'chat-composer__icon'));
  attachBtn.addEventListener('click', focusComposer);

  newChatBtn       = createElement('button', 'chat-composer__icon-button chat-composer__new-chat');
  newChatBtn.type  = 'button';
  newChatBtn.hidden = true;
  newChatBtn.append(createIcon('newChat', 'chat-composer__icon'));
  newChatBtn.addEventListener('click', () => {
    clearConversation();
    switchToTab('chat');
  });

  composerActions.append(attachBtn, newChatBtn);

  const composerSubmit = createElement('div', 'chat-composer__submit');
  modelButton          = createElement('button', 'chat-composer__model');
  modelButton.type     = 'button';
  modelButton.append(
    createElement('span', 'chat-composer__model-label', activeModelLabel),
    createIcon('chevronDown', 'chat-composer__model-icon')
  );
  modelButton.addEventListener('click', (e) => { e.stopPropagation(); openModelPicker(modelButton); });

  sendButton      = createElement('button', 'chat-composer__send');
  sendButton.type = 'button';
  const sendLabel = createElement('span', 'chat-composer__send-label');
  sendLabel.hidden = true;
  sendButton.append(createIcon('send', 'chat-composer__send-icon'), sendLabel);
  sendButton.addEventListener('click', () => {
    if (isSending) stopStream(); else void submitPrompt();
  });

  composerSubmit.append(modelButton, sendButton);
  composerFooter.append(composerActions, composerSubmit);
  composer.append(projectPill, composerField, composerFooter);

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
  syncActiveProjectPill();
  syncComposer();
  renderThread();
}

bootstrap();
