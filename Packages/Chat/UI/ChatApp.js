import en from '../I18n/en.js';
import de from '../I18n/de.js';
import fr from '../I18n/fr.js';
import { createLogoLoader } from '../../Shared/LogoLoader/LogoLoader.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';

const dictionaries = { en, de, fr };

const iconMarkup = {
  spark: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <path d="m13.5 3-1.2 4.5L8 8.8l4.3 1.3L13.5 15l1.2-4.9L19 8.8l-4.3-1.3Z" />
      <path d="m6 14-.7 2.2L3 17l2.3.8L6 20l.7-2.2L9 17l-2.3-.8Z" />
    </svg>
  `,
  briefcase: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
      <rect x="3.5" y="7" width="17" height="12.5" rx="3.5" />
      <path d="M3.5 12.5h17" />
      <path d="M10.5 12.5v1.3a1.5 1.5 0 0 0 3 0v-1.3" />
    </svg>
  `,
  skills: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a6 6 0 0 1 6 6c0 2.22-1.2 4.17-3 5.25V15a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 15v-1.75A6 6 0 0 1 12 2Z" />
      <path d="M9.5 18.5h5" />
      <path d="M10.5 21.5h3" />
    </svg>
  `,
  personas: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M4.5 20.5c0-4.14 3.36-7 7.5-7s7.5 2.86 7.5 7" />
    </svg>
  `,
  marketplace: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2 3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5Z" />
      <path d="M3 7h18" />
      <path d="M16 11a4 4 0 0 1-8 0" />
    </svg>
  `,
  sun: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4" />
    </svg>
  `,
  moon: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15.2 3.8a7.8 7.8 0 1 0 5 12.6 8.3 8.3 0 0 1-5.6-7.7 8.2 8.2 0 0 1 .6-3Z" />
      <path d="m17.8 5.2.4 1.3 1.3.4-1.3.4-.4 1.3-.4-1.3-1.3-.4 1.3-.4Z" />
    </svg>
  `,
  paperclip: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9.5 12.5 5.8-5.8a3.5 3.5 0 1 1 5 5l-8.2 8.2a5 5 0 1 1-7.1-7.1l8.4-8.4" />
    </svg>
  `,
  globe: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" />
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
  code: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5 10 19" />
    </svg>
  `,
  document: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3.5h6l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
      <path d="M14 3.5V8h4M9 12h6M9 15.5h4.5" />
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
  `
};

function getDictionary(locale) {
  return dictionaries[locale] ?? en;
}

function formatText(template, replacements) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template
  );
}

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createIcon(name, className = '') {
  const icon = createElement('span', className || 'chat-icon');
  icon.innerHTML = iconMarkup[name] ?? '';
  return icon;
}

function collapseWhitespace(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
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

function createDraftEntry(prompt, existingEntry) {
  const normalized = collapseWhitespace(prompt);
  if (!normalized) return null;

  if (existingEntry) {
    return { ...existingEntry, prompt: normalized, updatedAt: new Date().toISOString() };
  }

  const sentence = normalized.split(/[.!?]/).find(Boolean) ?? normalized;
  return {
    title: truncate(collapseWhitespace(sentence), 48),
    summary: truncate(normalized, 112),
    prompt: normalized,
    updatedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// createDockButton — standard icon button for the side nav.
// ---------------------------------------------------------------------------
function createDockButton({ label, icon, active = false, emphasis = false, onClick, onHover }) {
  const classes = [
    'chat-dock__button',
    active     ? 'chat-dock__button--active'   : '',
    emphasis   ? 'chat-dock__button--emphasis' : ''
  ].filter(Boolean).join(' ');

  const button = createElement('button', classes);
  button._dockLabel = label;
  button.append(createIcon(icon, 'chat-dock__icon'));
  button.append(createElement('span', 'chat-dock__sr-only', label));

  if (typeof onClick === 'function') button.addEventListener('click', onClick);

  if (typeof onHover === 'function') {
    const show = () => onHover(button, label);
    button.addEventListener('mouseenter', show);
    button.addEventListener('focus', show);
  }

  return button;
}

// ---------------------------------------------------------------------------
// createProfileButton — avatar button showing dynamically generated initials.
// ---------------------------------------------------------------------------
function createProfileButton({ name, label, onHover }) {
  const button = createElement('button', 'chat-dock__button chat-dock__button--profile');
  button._dockLabel = label;
  button.append(createElement('span', 'chat-dock__avatar-initials', getInitials(name)));
  button.append(createElement('span', 'chat-dock__sr-only', label));

  if (typeof onHover === 'function') {
    const show = () => onHover(button, name || label);
    button.addEventListener('mouseenter', show);
    button.addEventListener('focus', show);
  }

  return button;
}

// ---------------------------------------------------------------------------
// Message action bar — copy + retry.
// ---------------------------------------------------------------------------
function createMessageActions({ onCopy, onRetry }) {
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
    article.append(createMessageActions({ onCopy, onRetry }));
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

  attachCustomScrollbar(panel, scroller);
  return panel;
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
  let lastSelectedEntry = null;
  let isSending = false;
  let accText = '';
  let accThinking = '';
  let isDarkTheme = false;

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
  let dockCallout = null;
  let dockArea = null;
  let themeButton = null;
  let messages = [];

  // Model picker state
  let modelPickerPanel = null;
  let modelPickerOpen = false;
  let modelButton = null;

  // ---------------------------------------------------------------------------
  // Dock callout — uses getBoundingClientRect for reliable positioning
  // regardless of scroll position or intermediate layout containers.
  // ---------------------------------------------------------------------------

  function positionDockCallout(button, label) {
    if (!dockCallout || !button || !dockArea) return;
    const btnRect = button.getBoundingClientRect();
    const areaRect = dockArea.getBoundingClientRect();
    dockCallout.textContent = label;
    dockCallout.style.top = `${btnRect.top - areaRect.top + btnRect.height / 2}px`;
    dockCallout.hidden = false;
  }

  function hideDockCallout() {
    if (dockCallout) dockCallout.hidden = true;
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
      modelPickerPanel = createModelPickerPanel({
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
  // Theme toggle — switches sun ↔ moon icon and applies theme-dark to <html>.
  // ---------------------------------------------------------------------------

  function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.documentElement.classList.toggle('theme-dark', isDarkTheme);
    const iconEl = themeButton?.querySelector('.chat-dock__icon');
    if (iconEl) iconEl.innerHTML = isDarkTheme ? iconMarkup.moon : iconMarkup.sun;
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

  function setDraft(nextDraft, selectedEntry = null) {
    draftValue = nextDraft;
    lastSelectedEntry = selectedEntry;
    syncComposer();
    focusComposer();
  }

  function clearConversation() {
    messages = [];
    draftValue = '';
    lastSelectedEntry = null;
    isSending = false;
    window.JoaniumChat.removeStreamListeners();
    syncComposer();
    renderThread();
    focusComposer();
  }

  function renderThread() {
    if (!thread || !title || !composer || !canvas || !scroll || !bottom) return;

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

    const draftEntry = createDraftEntry(prompt, lastSelectedEntry);
    if (draftEntry) void window.JoaniumChat.saveRecentPrompt(draftEntry);

    messages = [
      ...messages,
      { role: 'user', content: prompt },
      { role: 'assistant', content: '', thinking: '', streaming: true,
        providerLabel: activeProvider?.label ?? 'AI', modelLabel: activeModelLabel }
    ];

    draftValue = '';
    lastSelectedEntry = null;
    isSending = true;
    accText = '';
    accThinking = '';
    syncComposer();
    renderThread();
    focusComposer();

    window.JoaniumChat.removeStreamListeners();

    window.JoaniumChat.onStreamChunk((chunk) => {
      if (chunk?.type === 'text'    && chunk.text) accText    += chunk.text;
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

  // ── Dock ──────────────────────────────────────────────────────────────────
  dockArea = createElement('aside', 'chat-dock-area');
  const dock = createElement('div', 'chat-dock');
  dockCallout = createElement('div', 'chat-dock__callout');
  dockCallout.hidden = true;

  // Top group: New Chat (emphasis)
  const dockTopStack = createElement('div', 'chat-dock__stack');
  const newChatBtn = createDockButton({
    label: strings.dock.newChat,
    icon: 'spark',
    emphasis: true,
    onClick: clearConversation,
    onHover: positionDockCallout
  });
  dockTopStack.append(newChatBtn);

  // Middle group: nav items
  const dockNavStack = createElement('div', 'chat-dock__stack');
  const navItems = [
    { label: strings.dock.projects,    icon: 'briefcase',   onClick: focusComposer },
    { label: strings.dock.skills,      icon: 'skills',                    onClick: focusComposer },
    { label: strings.dock.personas,    icon: 'personas',                  onClick: focusComposer },
    { label: strings.dock.marketplace, icon: 'marketplace',               onClick: focusComposer }
  ];
  for (const item of navItems) {
    dockNavStack.append(createDockButton({ ...item, onHover: positionDockCallout }));
  }

  // Bottom group: theme toggle + profile avatar
  const dockBottomStack = createElement('div', 'chat-dock__stack');

  themeButton = createDockButton({
    label: strings.dock.theme,
    icon: 'sun',
    onClick: toggleTheme,
    onHover: positionDockCallout
  });

  const profileBtn = createProfileButton({
    name: payload.user.profile.name,
    label: strings.dock.profile,
    onHover: positionDockCallout
  });

  dockBottomStack.append(themeButton, profileBtn);

  dock.addEventListener('mouseleave', hideDockCallout);
  dock.append(
    dockTopStack,
    dockNavStack,
    createElement('div', 'chat-dock__divider'),
    dockBottomStack
  );
  dockArea.append(dock, dockCallout);

  // ── Stage ─────────────────────────────────────────────────────────────────
  const stage = createElement('section', 'chat-stage');
  canvas = createElement('div', 'chat-stage__canvas');

  const topbar = createElement('div', 'chat-stage__topbar');
  const tabs = createElement('div', 'chat-stage__tabs');
  for (const [id, label] of Object.entries(strings.tabs)) {
    const tab = createElement(
      'button',
      `chat-stage__tab${id === 'chat' ? ' chat-stage__tab--active' : ''}`,
      label
    );
    tab.type = 'button';
    tabs.append(tab);
  }
  topbar.append(tabs);

  const topbarAvatar = createElement('button', 'chat-stage__topbar-avatar');
  topbarAvatar.type = 'button';
  topbarAvatar.append(createElement('span', 'chat-stage__topbar-initials', getInitials(payload.user.profile.name)));
  tabs.append(topbarAvatar);

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

  scroll.append(topbar, logoEl, title, subtitle, thread);
  bottom.append(composer);
  canvas.append(scroll, bottom);
  stage.append(canvas);
  shell.append(stage);
  root.replaceChildren(shell);

  syncComposer();
  renderThread();
}

bootstrap();
