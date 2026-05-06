import { getTimeGreetings } from '../../../Datasets/messages.js';
import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace, truncate } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createIcon, iconMarkup } from '../../Shared/Icons/Icons.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';

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

function createMessageElement(message, { onCopy, onRetry } = {}) {
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

function createModelPickerPanel({ providers, userProviderDetails, onSelect }) {
  const panel = createElement('div', 'chat-model-picker');
  document.body.append(panel);

  const scroller = createElement('div', 'chat-model-picker__scroller');
  panel.append(scroller);

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
      option.append(createElement('span', 'chat-model-picker__option-label', model.name ?? model.id));
      option.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(provider, model);
      });
      group.append(option);
    }

    scroller.append(group);
  }

  const scrollbar = attachCustomScrollbar(panel, scroller);
  return { element: panel, dispose: scrollbar.dispose };
}

function generateSessionId() {
  const date = new Date();
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;
}

export async function createChatView(strings, {
  getActiveProject,
  onActiveProjectChange,
  getActivePersona,
  onActivePersonaChange,
  getProfile
} = {}) {
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
  let isSending = false;
  let accText = '';
  let accThinking = '';
  let sessionId = null;
  let sessionCreatedAt = null;
  let messages = [];
  let streamDisposers = [];
  let modelPickerPanel = null;
  let modelPickerOpen = false;

  let composerField = null;
  let attachmentsEl = null;
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
      .map(({ role, content, thinking }) => {
        const entry = { role, content };
        if (thinking) entry.thinking = thinking;
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
    removeStreamListeners();
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
      sendButton.disabled = !draftValue.trim();
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
    isSending = false;
    sessionId = null;
    sessionCreatedAt = null;
    removeStreamListeners();
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

  async function submitPrompt() {
    const prompt = draftValue.trim();
    if (!prompt || isSending) return;

    const isNewSession = !sessionId;
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionCreatedAt = new Date().toISOString();
    }

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
    isSending = true;
    accText = '';
    accThinking = '';
    syncComposer();
    renderThread();
    focusComposer();
    removeStreamListeners();

    streamDisposers.push(onIpc('chat:stream-chunk', (chunk) => {
      if (chunk?.type === 'text' && chunk.text) accText += chunk.text;
      if (chunk?.type === 'thinking' && chunk.text) accThinking += chunk.text;
      updateLastStreamingMessage(thread, { content: accText, thinking: accThinking });
    }));

    streamDisposers.push(onIpc('chat:stream-done', (meta) => {
      removeStreamListeners();
      messages = messages.map((message, index) => index !== messages.length - 1 ? message : {
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
    }));

    streamDisposers.push(onIpc('chat:stream-error', (error) => {
      removeStreamListeners();
      messages = messages.map((message, index) => index !== messages.length - 1 ? message : {
        role: 'assistant',
        content: error?.message || 'Unable to get a response right now.',
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

    const historyToSend = messages.slice(0, -1).map(({ role, content }) => ({ role, content }));
    void invokeIpc('chat:stream-message', {
      messages: historyToSend,
      providerId: activeProvider?.id ?? null,
      modelId: activeModel?.id ?? null,
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
  composer.append(projectPill, composerField, composerFooter);
  scroll.append(title, thread);
  bottom.append(composer);
  view.append(scroll, bottom);

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
