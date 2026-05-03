import en from '../I18n/en.js';
import de from '../I18n/de.js';
import fr from '../I18n/fr.js';
import { createLogoLoader } from '../../Shared/LogoLoader/LogoLoader.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';

const dictionaries = { en, de, fr };

const iconMarkup = {
  plus: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  `,
  spark: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <path d="m13.5 3-1.2 4.5L8 8.8l4.3 1.3L13.5 15l1.2-4.9L19 8.8l-4.3-1.3Z" />
      <path d="m6 14-.7 2.2L3 17l2.3.8L6 20l.7-2.2L9 17l-2.3-.8Z" />
    </svg>
  `,
  moon: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15.2 3.8a7.8 7.8 0 1 0 5 12.6 8.3 8.3 0 0 1-5.6-7.7 8.2 8.2 0 0 1 .6-3Z" />
      <path d="m17.8 5.2.4 1.3 1.3.4-1.3.4-.4 1.3-.4-1.3-1.3-.4 1.3-.4Z" />
    </svg>
  `,
  grid: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4.5" y="4.5" width="5" height="5" rx="1.4" />
      <rect x="14.5" y="4.5" width="5" height="5" rx="1.4" />
      <rect x="4.5" y="14.5" width="5" height="5" rx="1.4" />
      <rect x="14.5" y="14.5" width="5" height="5" rx="1.4" />
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
  pen: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <path d="m4 20 4.4-1 9.2-9.2a2.2 2.2 0 0 0-3.1-3.1L5.3 15.9 4 20Z" />
      <path d="m12.8 8.4 2.8 2.8" />
    </svg>
  `,
  mail: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3.5" y="5.5" width="17" height="13" rx="3.2" />
      <path d="m5.8 8.3 6.2 4.8 6.2-4.8" />
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
  // Used for the reasoning / thinking block header
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

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

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
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function getFirstName(name, fallback) {
  const normalizedName = collapseWhitespace(name);

  if (!normalizedName) {
    return fallback;
  }

  return normalizedName.split(' ')[0];
}

function getGreetingKey(date) {
  const hour = date.getHours();

  if (hour < 12) {
    return 'morning';
  }

  if (hour < 18) {
    return 'afternoon';
  }

  return 'evening';
}

function createDraftEntry(prompt, existingEntry) {
  const normalizedPrompt = collapseWhitespace(prompt);

  if (!normalizedPrompt) {
    return null;
  }

  if (existingEntry) {
    return {
      ...existingEntry,
      prompt: normalizedPrompt,
      updatedAt: new Date().toISOString()
    };
  }

  const sentence = normalizedPrompt.split(/[.!?]/).find(Boolean) ?? normalizedPrompt;

  return {
    title: truncate(collapseWhitespace(sentence), 48),
    summary: truncate(normalizedPrompt, 112),
    prompt: normalizedPrompt,
    updatedAt: new Date().toISOString()
  };
}

function createDockButton({ label, icon, active = false, emphasis = false, onClick, onHover }) {
  const button = createElement(
    'button',
    `chat-dock__button${active ? ' chat-dock__button--active' : ''}${emphasis ? ' chat-dock__button--emphasis' : ''}`
  );
  button._dockLabel = label;
  button.append(createIcon(icon, 'chat-dock__icon'));
  button.append(createElement('span', 'chat-dock__sr-only', label));

  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  if (typeof onHover === 'function') {
    const show = () => onHover(button, label);
    button.addEventListener('mouseenter', show);
    button.addEventListener('focus', show);
  }

  return button;
}

// ---------------------------------------------------------------------------
// Message element builder
// Supports pending (dots), streaming (live text + thinking), and final states.
// ---------------------------------------------------------------------------

function createMessageElement(message) {
  const article = createElement(
    'article',
    [
      'chat-message',
      `chat-message--${message.role}`,
      message.streaming ? 'chat-message--streaming' : '',
      message.error ? 'chat-message--error' : ''
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (message.role === 'assistant') {
    // ------------------------------------------------------------------
    // Thinking / reasoning block — shown as a collapsible <details>
    // Hidden when there is no thinking content.
    // ------------------------------------------------------------------
    const thinkingWrap = document.createElement('details');
    thinkingWrap.className = 'chat-message__thinking';
    thinkingWrap.hidden = !message.thinking;
    // Closed by default — user clicks to expand

    const thinkingSummary = createElement('summary', 'chat-message__thinking-summary');
    thinkingSummary.append(
      createIcon('thinking', 'chat-message__thinking-icon'),
      createElement('span', 'chat-message__thinking-label', 'Reasoning')
    );
    thinkingWrap.append(thinkingSummary);

    const thinkingBody = createElement('div', 'chat-message__thinking-body');
    const thinkingText = createElement('p', 'chat-message__thinking-text', message.thinking ?? '');
    thinkingBody.append(thinkingText);
    thinkingWrap.append(thinkingBody);

    article.append(thinkingWrap);

    // ------------------------------------------------------------------
    // Main reply bubble
    // ------------------------------------------------------------------
    const bubble = createElement('div', 'chat-message__bubble');

    if (message.pending || (message.streaming && !message.content)) {
      // No content yet — show animated dots
      const dots = createElement('span', 'chat-message__dots');
      dots.innerHTML = '<span></span><span></span><span></span>';
      bubble.append(dots);
    } else {
      // Text in its own span so the stream-dot sibling stays alive during updates
      const textSpan = createElement('span', 'chat-message__text', (message.content ?? '').trimStart());
      bubble.append(textSpan);
      if (message.streaming) {
        bubble.append(createElement('span', 'chat-message__stream-dot'));
      }
    }

    article.append(bubble);
  } else {
    const bubble = createElement('div', 'chat-message__bubble', message.content);
    article.append(bubble);
  }

  return article;
}

// ---------------------------------------------------------------------------
// Direct DOM update for the currently-streaming message.
// Called on every chunk so we never rebuild the whole thread while streaming.
// ---------------------------------------------------------------------------

function updateLastStreamingMessage(threadEl, { content, thinking }) {
  const lastEl = threadEl?.lastElementChild;
  if (!lastEl || !lastEl.classList.contains('chat-message--assistant')) return;

  // --- Thinking block -------------------------------------------------
  const thinkingWrap = lastEl.querySelector('.chat-message__thinking');
  const thinkingText = lastEl.querySelector('.chat-message__thinking-text');

  if (thinkingWrap && thinkingText) {
    if (thinking) {
      thinkingText.textContent = thinking;
      thinkingWrap.hidden = false;
      // Stay closed — user opens manually
    }
  }

  // --- Content bubble -------------------------------------------------
  const bubble = lastEl.querySelector('.chat-message__bubble');
  if (bubble && content) {
    // First chunk: swap out loading dots
    const dots = bubble.querySelector('.chat-message__dots');
    if (dots) dots.remove();

    // Update text span (preserves stream-dot sibling)
    let textSpan = bubble.querySelector('.chat-message__text');
    if (!textSpan) {
      textSpan = createElement('span', 'chat-message__text');
      bubble.prepend(textSpan);
    }
    textSpan.textContent = content.trimStart();

    // Ensure the moving dot is present while streaming
    if (!bubble.querySelector('.chat-message__stream-dot')) {
      bubble.append(createElement('span', 'chat-message__stream-dot'));
    }
  }

  // Keep the new content visible
  lastEl.scrollIntoView({ block: 'end', behavior: 'smooth' });
}

function getPreferredProvider(payload) {
  const selectedProviderIds = payload.user?.providers?.selected ?? [];
  const providersById = new Map(payload.providers.map((provider) => [provider.id, provider]));
  const orderedProviders = [
    ...selectedProviderIds.map((providerId) => providersById.get(providerId)).filter(Boolean),
    ...payload.providers.filter((provider) => !selectedProviderIds.includes(provider.id))
  ];

  return (
    orderedProviders.find((provider) => {
      const details = payload.user?.providers?.details?.[provider.id] ?? {};
      const hasModel = Boolean(provider.models?.[0]?.id);
      const hasEndpoint = Boolean(collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint));
      const hasCredential = provider.requiresApiKey ? Boolean(collapseWhitespace(details.apiKey)) : true;
      return hasModel && hasEndpoint && hasCredential;
    }) ??
    orderedProviders.find((provider) => provider.models?.length > 0) ??
    payload.providers[0] ??
    null
  );
}

// ---------------------------------------------------------------------------
// Model picker — a compact portal panel for switching provider + model
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

    const groupHeader = createElement('div', 'chat-model-picker__group-header', provider.label);
    group.append(groupHeader);

    for (const model of provider.models) {
      const option = createElement('button', 'chat-model-picker__option');
      option._pickerProviderId = provider.id;
      option._pickerModelId = model.id;

      option.append(createElement('span', 'chat-model-picker__option-label', model.name ?? model.id));

      option.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(provider, model);
      });

      group.append(option);
    }

    scroller.append(group);
  }

  attachCustomScrollbar(panel, scroller);

  return panel;
}

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
  let composerField = null;
  let sendButton = null;
  let thread = null;
  let title = null;
  let composer = null;
  let canvas = null;
  let scroll = null;
  let bottom = null;
  let dockCallout = null;
  let pinnedDockButton = null;
  let messages = [];

  // Model picker state
  let modelPickerPanel = null;
  let modelPickerOpen = false;

  function closeModelPicker() {
    if (modelPickerPanel) {
      modelPickerPanel.classList.remove('chat-model-picker--open');
    }
    modelButton?.classList.remove('chat-composer__model--open');
    modelPickerOpen = false;
  }

  function syncPickerActiveStates() {
    if (!modelPickerPanel) return;

    for (const option of modelPickerPanel.querySelectorAll('.chat-model-picker__option')) {
      const isActive = option._pickerProviderId === activeProvider?.id
        && option._pickerModelId === activeModel?.id;

      option.classList.toggle('chat-model-picker__option--active', isActive);

      const existingCheck = option.querySelector('.chat-model-picker__check');
      if (isActive && !existingCheck) {
        option.append(createIcon('check', 'chat-model-picker__check'));
      } else if (!isActive && existingCheck) {
        existingCheck.remove();
      }
    }
  }

  function openModelPicker(triggerButton) {
    if (modelPickerOpen) {
      closeModelPicker();
      return;
    }

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

    // Animate in
    requestAnimationFrame(() => {
      modelPickerPanel?.classList.add('chat-model-picker--open');
    });

    // Click-outside to close
    const onDocumentClick = (event) => {
      if (!modelPickerPanel?.contains(event.target) && !triggerButton.contains(event.target)) {
        closeModelPicker();
        document.removeEventListener('click', onDocumentClick, { capture: true });
        document.removeEventListener('keydown', onDocumentKeydown);
      }
    };

    const onDocumentKeydown = (event) => {
      if (event.key === 'Escape') {
        closeModelPicker();
        document.removeEventListener('click', onDocumentClick, { capture: true });
        document.removeEventListener('keydown', onDocumentKeydown);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', onDocumentClick, { capture: true });
      document.addEventListener('keydown', onDocumentKeydown);
    }, 0);
  }

  function positionDockCallout(button, label) {
    if (!dockCallout || !button) {
      return;
    }

    dockCallout.textContent = label.toLowerCase();
    dockCallout.style.top = `${button.offsetTop + button.offsetHeight / 2}px`;
    dockCallout.hidden = false;
  }

  function restoreDockCallout() {
    if (pinnedDockButton) {
      positionDockCallout(pinnedDockButton, pinnedDockButton._dockLabel);
      return;
    }

    if (dockCallout) {
      dockCallout.hidden = true;
    }
  }

  function syncComposer() {
    if (!composerField || !sendButton) {
      return;
    }

    composerField.value = draftValue;
    sendButton.disabled = !draftValue.trim() || isSending;
    sendButton.classList.toggle('chat-composer__send--busy', isSending);
  }

  function focusComposer() {
    if (!composerField) {
      return;
    }

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
    if (!thread || !title || !composer || !canvas || !scroll || !bottom) {
      return;
    }

    const hasMessages = messages.length > 0;
    logoEl.hidden = hasMessages;
    title.hidden = hasMessages;
    thread.hidden = !hasMessages;
    if (subtitle) subtitle.hidden = hasMessages;
    composer.classList.toggle('chat-composer--conversation', hasMessages);
    scroll.classList.toggle('chat-stage__scroll--conversation', hasMessages);
    bottom.classList.toggle('chat-stage__bottom--conversation', hasMessages);

    if (!hasMessages) {
      thread.replaceChildren();
      return;
    }

    thread.replaceChildren(...messages.map((message) => createMessageElement(message)));
    requestAnimationFrame(() => {
      thread.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
  }

  // ---------------------------------------------------------------------------
  // submitPrompt — streams the response, updating the DOM token-by-token.
  // ---------------------------------------------------------------------------

  async function submitPrompt() {
    const prompt = draftValue.trim();

    if (!prompt || isSending) {
      return;
    }

    const draftEntry = createDraftEntry(prompt, lastSelectedEntry);
    if (draftEntry) {
      void window.JoaniumChat.saveRecentPrompt(draftEntry);
    }

    // Append user message + streaming placeholder for the assistant reply
    messages = [
      ...messages,
      { role: 'user', content: prompt },
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
    lastSelectedEntry = null;
    isSending = true;
    syncComposer();
    renderThread();
    focusComposer();

    // Accumulated content for the current stream
    let accText = '';
    let accThinking = '';

    // Remove any leftover listeners from a previous turn
    window.JoaniumChat.removeStreamListeners();

    window.JoaniumChat.onStreamChunk((chunk) => {
      if (chunk?.type === 'text' && chunk.text) {
        accText += chunk.text;
      } else if (chunk?.type === 'thinking' && chunk.text) {
        accThinking += chunk.text;
      }

      updateLastStreamingMessage(thread, { content: accText, thinking: accThinking });
    });

    window.JoaniumChat.onStreamDone((meta) => {
      window.JoaniumChat.removeStreamListeners();

      messages = messages.map((message, index) => {
        if (index !== messages.length - 1) return message;

        return {
          role: 'assistant',
          content: accText || 'No response received.',
          thinking: accThinking,
          streaming: false,
          providerLabel: meta?.providerLabel ?? activeProvider?.label ?? 'AI',
          modelLabel: meta?.modelLabel ?? activeModelLabel
        };
      });

      isSending = false;
      syncComposer();
      renderThread();
    });

    window.JoaniumChat.onStreamError((err) => {
      window.JoaniumChat.removeStreamListeners();

      messages = messages.map((message, index) => {
        if (index !== messages.length - 1) return message;

        return {
          role: 'assistant',
          content: err?.message || 'Unable to get a response right now.',
          thinking: accThinking,
          streaming: false,
          error: true,
          providerLabel: activeProvider?.label ?? 'AI',
          modelLabel: activeModelLabel
        };
      });

      isSending = false;
      syncComposer();
      renderThread();
    });

    // Build the conversation history to send (all completed messages, no streaming placeholder)
    const historyToSend = messages
      .slice(0, -1) // Remove the current streaming placeholder
      .map(({ role, content }) => ({ role, content }));

    // Kick off the stream — fire-and-forget; results arrive via the event listeners above
    void window.JoaniumChat.streamMessage({
      messages: historyToSend,
      providerId: activeProvider?.id ?? null,
      modelId: activeModel?.id ?? null
    });
  }

  const shell = createElement('main', 'chat-shell');
  const dockArea = createElement('aside', 'chat-dock-area');
  const dock = createElement('div', 'chat-dock');
  const dockUtilities = createElement('div', 'chat-dock__stack');
  const dockPrimary = createElement('div', 'chat-dock__stack');
  dockCallout = createElement('div', 'chat-dock__callout', 'projects');
  dockCallout.hidden = true;

  const dockButtonDefinitions = [
    {
      label: 'New Chat',
      icon: 'spark',
      emphasis: true,
      onClick: clearConversation
    },
    {
      label: 'Focus Input',
      icon: 'moon',
      onClick: focusComposer
    }
  ];

  const dockPrimaryDefinitions = [
    {
      label: 'Workspace',
      icon: 'grid',
      onClick: () => {
        const suggestion = quickStartCards[0];
        if (suggestion) {
          setDraft(suggestion.prompt, suggestion);
        }
      }
    },
    {
      label: 'Projects',
      icon: 'briefcase',
      active: true,
      onClick: focusComposer
    },
    {
      label: 'Compose',
      icon: 'pen',
      onClick: focusComposer
    },
    {
      label: 'Inbox',
      icon: 'mail',
      onClick: focusComposer
    }
  ];

  for (const definition of dockButtonDefinitions) {
    dockUtilities.append(
      createDockButton({
        ...definition,
        onHover: positionDockCallout
      })
    );
  }

  for (const definition of dockPrimaryDefinitions) {
    const button = createDockButton({
      ...definition,
      onHover: positionDockCallout
    });

    if (definition.active) {
      pinnedDockButton = button;
    }

    dockPrimary.append(button);
  }

  dock.addEventListener('mouseleave', restoreDockCallout);
  dock.append(dockUtilities, createElement('div', 'chat-dock__divider'), dockPrimary);
  dockArea.append(dock, dockCallout);

  const stage = createElement('section', 'chat-stage');
  canvas = createElement('div', 'chat-stage__canvas');

  const topbar = createElement('div', 'chat-stage__topbar');
  const tabs = createElement('div', 'chat-stage__tabs');
  for (const [id, label] of Object.entries(strings.tabs)) {
    const tab = createElement(
      'button',
      `chat-stage__tab${id === 'chats' ? ' chat-stage__tab--active' : ''}`,
      label
    );
    tab.type = 'button';
    tabs.append(tab);
  }
  topbar.append(tabs);

  title = createElement(
    'h1',
    'chat-stage__title',
    formatText(strings.greeting[greetingKey], { name: firstName })
  );

  const { element: logoEl } = createLogoLoader({ logoPath: payload.logoPath, infinite: true, inline: true });
  logoEl.classList.add('chat-stage__logo');

  const subtitle = createElement('p', 'chat-stage__subtitle', "You\u2019re doing great \u2014 let\u2019s make today count.");
  thread = createElement('section', 'chat-thread');
  thread.hidden = true;

  composer = createElement('section', 'chat-composer');
  composerField = document.createElement('textarea');
  composerField.className = 'chat-composer__field';
  composerField.placeholder = strings.composer.placeholder;
  composerField.rows = 3;
  composerField.addEventListener('input', (event) => {
    draftValue = event.target.value;
    lastSelectedEntry = null;
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
  const composerActionDefinitions = [
    {
      icon: 'plus',
      onClick: clearConversation
    },
    {
      icon: 'paperclip',
      onClick: focusComposer
    }
  ];

  for (const action of composerActionDefinitions) {
    const actionButton = createElement('button', 'chat-composer__icon-button');
    actionButton.type = 'button';
    actionButton.append(createIcon(action.icon, 'chat-composer__icon'));
    actionButton.addEventListener('click', action.onClick);
    composerActions.append(actionButton);
  }

  const composerSubmit = createElement('div', 'chat-composer__submit');
  const modelButton = createElement('button', 'chat-composer__model');
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
  sendButton.append(createIcon('send', 'chat-composer__send-icon'));
  sendButton.addEventListener('click', () => {
    void submitPrompt();
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
  shell.append(dockArea, stage);
  root.replaceChildren(shell);

  syncComposer();
  renderThread();
  requestAnimationFrame(restoreDockCallout);
}

bootstrap();
