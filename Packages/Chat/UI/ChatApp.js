import en from '../I18n/en.js';
import de from '../I18n/de.js';
import fr from '../I18n/fr.js';

const dictionaries = { en, de, fr };

const iconMarkup = {
  plus: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  `,
  search: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  `,
  sliders: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  `,
  chat: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 6.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
    </svg>
  `,
  folder: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h3l2 2h7a2.5 2.5 0 0 1 2.5 2.5V16A2.5 2.5 0 0 1 18 18.5H6A2.5 2.5 0 0 1 3.5 16Z" />
    </svg>
  `,
  squareCheck: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8.5 12 2.4 2.4 4.6-5" />
    </svg>
  `,
  robot: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 4h6M12 4V2" />
      <rect x="5" y="7" width="14" height="11" rx="4" />
      <path d="M8 18v2M16 18v2M8.5 11.5h.01M15.5 11.5h.01M9 15h6" />
    </svg>
  `,
  building: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 20V6.5A1.5 1.5 0 0 1 6.5 5H14v15" />
      <path d="M14 9h3.5A1.5 1.5 0 0 1 19 10.5V20" />
      <path d="M9 9h1M9 12h1M9 15h1M13 12h1M13 15h1" />
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
  spark: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m13.5 3-1.2 4.5L8 8.8l4.3 1.3L13.5 15l1.2-4.9L19 8.8l-4.3-1.3Z" />
      <path d="m6 14-.7 2.2L3 17l2.3.8L6 20l.7-2.2L9 17l-2.3-.8Z" />
    </svg>
  `,
  globe: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" />
    </svg>
  `,
  paperclip: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9.5 12.5 5.8-5.8a3.5 3.5 0 1 1 5 5l-8.2 8.2a5 5 0 1 1-7.1-7.1l8.4-8.4" />
    </svg>
  `,
  mic: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
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

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
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

function createSidebarAction(label, iconName, onClick) {
  const button = createElement('button', 'chat-sidebar__icon-button');
  button.type = 'button';
  button.append(createIcon(iconName, 'chat-sidebar__action-icon'));
  button.append(createElement('span', 'chat-sidebar__sr-only', label));

  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return button;
}

function createNavigationItem(label, iconName) {
  const button = createElement('button', 'chat-sidebar__icon-button');
  button.type = 'button';
  button.append(createIcon(iconName, 'chat-sidebar__nav-icon'));
  button.append(createElement('span', 'chat-sidebar__sr-only', label));
  return button;
}

async function bootstrap() {
  const payload = await window.JoaniumChat.bootstrap();
  const strings = getDictionary(payload.user.locale);
  const root = document.getElementById('app');
  const isMac = /mac/i.test(navigator.platform);
  const firstName = getFirstName(payload.user.profile.name, strings.appName);
  const greetingKey = getGreetingKey(new Date());
  const activeProvider =
    payload.providers.find((provider) => payload.user.providers.selected.includes(provider.id)) ??
    payload.providers[0] ??
    null;
  const activeModelLabel = activeProvider?.featuredModels?.[0] ?? strings.composer.modelFallback;
  const quickStartCards = strings.quickStartCards.slice(0, 4);

  let draftValue = '';
  let lastSelectedEntry = null;
  let composerField = null;
  let sendButton = null;

  function syncComposer() {
    if (!composerField || !sendButton) {
      return;
    }

    composerField.value = draftValue;
    sendButton.disabled = !collapseWhitespace(draftValue);
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

  async function savePrompt() {
    const nextEntry = createDraftEntry(draftValue, lastSelectedEntry);

    if (!nextEntry) {
      return;
    }

    await window.JoaniumChat.saveRecentPrompt(nextEntry);
    draftValue = '';
    lastSelectedEntry = null;
    syncComposer();
  }

  const shell = createElement('main', 'chat-shell');
  shell.classList.add(isMac ? 'chat-shell--macos' : 'chat-shell--desktop');
  const shellHeader = createElement('header', 'chat-shell__header');
  const shellHeaderStart = createElement('div', 'chat-shell__header-side chat-shell__header-side--start');
  const shellHeaderCenter = createElement('div', 'chat-shell__header-center');
  const shellHeaderEnd = createElement('div', 'chat-shell__header-side chat-shell__header-side--end');

  const sidebar = createElement('aside', 'chat-sidebar');

  const sidebarActions = createElement('div', 'chat-sidebar__actions');
  sidebarActions.append(
    createSidebarAction(strings.actions.newChat, 'plus', () => {
      draftValue = '';
      lastSelectedEntry = null;
      syncComposer();
      focusComposer();
    }),
    createSidebarAction(strings.actions.search, 'search', focusComposer),
    createSidebarAction(strings.actions.customize, 'sliders', () => {
      const suggestion = quickStartCards[0];

      if (suggestion) {
        setDraft(suggestion.prompt, suggestion);
      }
    })
  );

  const sidebarNav = createElement('nav', 'chat-sidebar__nav');
  sidebarNav.append(
    createNavigationItem(strings.navigation.chats, 'chat'),
    createNavigationItem(strings.navigation.projects, 'folder'),
    createNavigationItem(strings.navigation.tasks, 'squareCheck'),
    createNavigationItem(strings.navigation.agents, 'robot'),
    createNavigationItem(strings.navigation.companies, 'building')
  );

  const profile = createElement('div', 'chat-sidebar__profile chat-sidebar__profile--compact');
  const avatar = createElement('span', 'chat-sidebar__avatar', firstName.slice(0, 1).toUpperCase());
  profile.append(avatar);

  sidebar.append(sidebarActions, sidebarNav, profile);

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
  shellHeaderCenter.append(tabs);
  shellHeader.append(shellHeaderStart, shellHeaderCenter, shellHeaderEnd);

  const shellBody = createElement('div', 'chat-shell__body');
  const stage = createElement('section', 'chat-stage');
  const canvas = createElement('div', 'chat-stage__canvas');

  const title = createElement(
    'h1',
    'chat-stage__title',
    formatText(strings.greeting[greetingKey], { name: firstName })
  );

  const composer = createElement('section', 'chat-composer');
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
      void savePrompt();
    }
  });

  const composerFooter = createElement('div', 'chat-composer__footer');
  const composerActions = createElement('div', 'chat-composer__actions');
  const actionIcons = ['plus', 'paperclip', 'globe', 'mic'];

  for (const iconName of actionIcons) {
    const actionButton = createElement('button', 'chat-composer__icon-button');
    actionButton.type = 'button';
    actionButton.append(createIcon(iconName, 'chat-composer__icon'));
    composerActions.append(actionButton);
  }

  const composerSubmit = createElement('div', 'chat-composer__submit');
  const modelButton = createElement('button', 'chat-composer__model');
  modelButton.type = 'button';
  modelButton.append(
    createElement('span', 'chat-composer__model-label', activeModelLabel),
    createIcon('chevronDown', 'chat-composer__model-icon')
  );

  sendButton = createElement('button', 'chat-composer__send');
  sendButton.type = 'button';
  sendButton.append(createIcon('send', 'chat-composer__send-icon'));
  sendButton.addEventListener('click', () => {
    void savePrompt();
  });

  composerSubmit.append(modelButton, sendButton);
  composerFooter.append(composerActions, composerSubmit);
  composer.append(composerField, composerFooter);

  const quickStart = createElement('section', 'chat-quick-start');
  quickStart.append(createElement('span', 'chat-quick-start__title', strings.sections.quickStart));
  const quickStartGrid = createElement('div', 'chat-quick-start__grid');

  for (const entry of quickStartCards) {
    const card = createElement('button', 'chat-quick-start__card');
    card.type = 'button';
    const iconBubble = createElement('span', 'chat-quick-start__icon-wrap');
    iconBubble.append(createIcon(entry.icon, 'chat-quick-start__icon'));

    const textWrap = createElement('span', 'chat-quick-start__copy');
    textWrap.append(
      createElement('strong', 'chat-quick-start__card-title', entry.title),
      createElement('span', 'chat-quick-start__card-summary', entry.summary)
    );

    card.append(iconBubble, textWrap);
    card.addEventListener('click', () => {
      setDraft(entry.prompt, entry);
    });
    quickStartGrid.append(card);
  }

  quickStart.append(quickStartGrid);
  canvas.append(title, composer, quickStart);
  stage.append(canvas);

  shellBody.append(sidebar, stage);
  shell.append(shellHeader, shellBody);
  root.replaceChildren(shell);
  syncComposer();
}

bootstrap();
