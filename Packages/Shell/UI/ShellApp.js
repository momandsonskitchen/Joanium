import strings from '../I18n/en.js';
import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon, iconMarkup } from '../../Shared/Icons/Icons.js';
import { createChatView } from '../../Chat/UI/ChatApp.js';
import { createHistoryPanel } from '../../History/UI/HistoryPanel.js';
import { createChannelsPanel } from '../../Channels/UI/ChannelsPanel.js';
import { createChannelGateway } from '../../Channels/UI/ChannelGateway.js';
import { createEventsPanel } from '../../Events/UI/EventsPanel.js';
import { createProjectsPanel } from '../../Projects/UI/ProjectsPanel.js';
import { createMemoryPanel } from '../../Memory/UI/MemoryPanel.js';
import { createTemplatesPanel } from '../../Templates/UI/TemplatesPanel.js';
import { createAgentsPanel } from '../../Agents/UI/AgentsPanel.js';
import { createAgentGateway } from '../../Agents/UI/AgentGateway.js';
import { createSkillsPanel } from '../../Skills/UI/SkillsPanel.js';
import { createPersonasPanel } from '../../Personas/UI/PersonasPanel.js';
import { createMarketplacePanel } from '../../Marketplace/UI/MarketplacePanel.js';
import { createUsagePanel } from '../../Usage/UI/UsagePanel.js';
import { createUserPanel } from '../../User/UI/UserPanel.js';
import { createAboutPanel } from '../../About/UI/AboutPanel.js';
import { createAppSettingsPanel } from '../../AppSettings/UI/AppSettingsPanel.js';
import { mountLockScreen } from '../../Security/UI/LockScreen.js';
import { createSecurityPanel } from '../../Security/UI/SecurityPanel.js';
import { createAutoLockTimer } from '../../Security/UI/AutoLockTimer.js';
import { createThemePanel } from '../../Themes/UI/ThemePanel.js';
import { loadAndApplyThemeState, stripNativeTooltips } from '../../Themes/UI/ThemeController.js';
import { createMCPPanel } from '../../MCP/UI/MCPPanel.js';
import { createProvidersPanel } from '../../Providers/UI/ProvidersPanel.js';
import { createConnectorsPanel } from '../../Toolset/Connectors/UI/ConnectorsPanel.js';
import { registerShortcuts } from './Shortcuts.js';
import { createShortcutsPanel } from './ShortcutsPanel.js';
import { createSlashCommandsPanel } from '../../SlashCommands/UI/SlashCommandsPanel.js';
import { mountBirthdayCard } from '../../User/UI/BirthdayCard.js';

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

// Convert an absolute filesystem path to a file:// URL Chromium can load.
function toFileUrl(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

async function bootstrap() {
  stripNativeTooltips();
  await loadAndApplyThemeState();
  // ── Security lock gate ─────────────────────────────────────────────────────
  // Must resolve before ANY UI is built. If the app is locked, the lock screen
  // covers the entire viewport and awaits a correct password / secret answer.
  try {
    const secStatus = await invokeIpc('security:get-status');
    if (secStatus.enabled) {
      await mountLockScreen(strings.security, secStatus);
    }
  } catch {
    // Security package not ready or disabled — proceed normally.
  }

  // ── Auto-lock timer ────────────────────────────────────────────────────
  // Created here so it is in scope for buildSettingsPanel below.
  // The timer listens to window activity events and fires onLock when idle.
  const autoLockTimer = createAutoLockTimer({
    onLock: async () => {
      try {
        autoLockTimer.pause();
        const status = await invokeIpc('security:get-status');
        if (!status.enabled) return;
        await mountLockScreen(strings.security, status);
        await autoLockTimer.refresh();
      } catch {
        // Non-fatal.
      }
    },
  });
  autoLockTimer.start();

  const payload = await invokeIpc('shell:bootstrap');
  const appSettings = await invokeIpc('app-settings:get').catch(() => ({}));
  const root = document.getElementById('app');
  let profile = payload.user?.profile ?? {};
  let activeProject = null;
  let activePersona = null;

  // Load the persisted active persona from User.json before anything renders
  try {
    activePersona = await invokeIpc('personas:get-active-persona');
  } catch {
    // non-fatal — ChatApp has its own Joana fallback
  }
  let activeRouteId = appSettings.defaultView ?? 'chat';
  let activeTabEl = null;
  let chatView = null;
  let settingsPanel = null;
  let avatarInitials = null;
  let avatarImg = null;
  const channelGateway = createChannelGateway(strings.channels, {
    chatStrings: strings.chat,
    getActivePersona: () => activePersona,
  });

  const agentGateway = createAgentGateway(strings.agents, {
    chatStrings: strings.chat,
    getActivePersona: () => activePersona,
  });

  const routeViews = new Map();
  const tabElements = new Map();
  channelGateway.start();
  agentGateway.start();

  const shell = createElement('main', 'chat-shell');
  const sidebar = createElement('nav', 'chat-sidebar');
  const sidebarTabs = createElement('div', 'chat-sidebar__tabs');
  const tabIndicator = createElement('div', 'chat-sidebar__indicator');
  const stage = createElement('section', 'chat-stage');
  const canvas = createElement('div', 'chat-stage__canvas');
  const dragRegion = createElement('div', 'chat-stage__drag-region');

  function moveIndicatorToTab(tabEl, animate) {
    if (!tabEl) return;
    if (!animate) {
      tabIndicator.style.transition = 'none';
    }

    const tabsRect = sidebarTabs.getBoundingClientRect();
    const tabRect = tabEl.getBoundingClientRect();
    tabIndicator.style.top = `${tabRect.top - tabsRect.top}px`;
    tabIndicator.style.height = `${tabRect.height}px`;

    if (!animate) {
      tabIndicator.offsetHeight;
      tabIndicator.style.transition = '';
    }
  }

  function setActiveProject(project) {
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

    chatView?.setActiveProject(activeProject);
  }

  function setActivePersona(persona) {
    activePersona = persona ?? null;
    chatView?.setActivePersona(activePersona);

    // Persist the choice — falling back to Joana when deactivated
    const ref = persona
      ? { namespace: persona.namespace, filename: persona.filename }
      : { namespace: 'Joanium', filename: 'Joana.md' };
    void invokeIpc('personas:set-active-persona', ref.namespace, ref.filename);
  }

  async function ensureChatView() {
    if (!chatView) {
      chatView = await createChatView(strings.chat, {
        getActiveProject: () => activeProject,
        onActiveProjectChange: setActiveProject,
        getActivePersona: () => activePersona,
        onActivePersonaChange: setActivePersona,
        getProfile: () => profile,
        onNavigate: showRoute,
        onOpenSettings: showSettingsPanel,
      });
      canvas.append(chatView.element);
      routeViews.set('chat', {
        element: chatView.element,
        onShow: () => chatView.focusComposer(),
      });
    }

    return chatView;
  }

  const routeDefinitions = [
    {
      id: 'chat',
      icon: 'tabChat',
      create: async () => {
        await ensureChatView();
        return routeViews.get('chat');
      },
    },
    {
      id: 'history',
      icon: 'tabHistory',
      create: async () => {
        const panel = createHistoryPanel(strings.history, {
          onNewChat: async () => {
            const chat = await ensureChatView();
            chat.clearConversation();
            await showRoute('chat');
            chat.focusComposer();
          },
          onLoadSession: async (id) => {
            const chat = await ensureChatView();
            await chat.loadSession(id);
            await showRoute('chat');
            chat.focusComposer();
          },
          getCurrentSessionId: () => chatView?.getCurrentSessionId() ?? null,
          getActiveProject: () => activeProject,
        });
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: async () => {
            element._search.clear();
            await panel.populateList(element._contentEl);
          },
        };
      },
    },
    {
      id: 'projects',
      icon: 'tabProjects',
      create: async () => {
        const panel = createProjectsPanel(strings.projects, {
          onOpenProject: async (project) => {
            setActiveProject(project);
            const chat = await ensureChatView();
            chat.clearConversation();
            await showRoute('chat');
            chat.focusComposer();
          },
          getActiveProject: () => activeProject,
        });
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim()),
        };
      },
    },
    {
      id: 'memory',
      icon: 'tabMemory',
      create: async () => {
        const panel = createMemoryPanel(strings.memory);
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.onShow(),
        };
      },
    },
    {
      id: 'templates',
      icon: 'tabTemplates',
      create: async () => {
        const panel = createTemplatesPanel(strings.templates);
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim()),
        };
      },
    },
    {
      id: 'agents',
      icon: 'tabAgents',
      create: async () => {
        const panel = createAgentsPanel(strings.agents);
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim()),
        };
      },
    },
    {
      id: 'skills',
      icon: 'tabSkills',
      create: async () => {
        const panel = createSkillsPanel(strings.skills);
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim()),
        };
      },
    },
    {
      id: 'personas',
      icon: 'tabPersonas',
      create: async () => {
        const panel = createPersonasPanel(strings.personas, {
          getActivePersona: () => activePersona,
          onActivatePersona: setActivePersona,
        });
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim()),
        };
      },
    },
    {
      id: 'marketplace',
      icon: 'tabMarketplace',
      create: async () => {
        const panel = createMarketplacePanel(strings.marketplace);
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim()),
        };
      },
    },
    {
      id: 'events',
      icon: 'tabEvents',
      create: async () => {
        const panel = createEventsPanel(strings.events);
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populate(),
        };
      },
    },
    {
      id: 'usage',
      icon: 'tabUsage',
      create: async () => {
        const panel = createUsagePanel(strings.usage);
        canvas.append(panel.element);
        return {
          element: panel.element,
          onShow: () => panel.onShow(),
        };
      },
    },
  ];

  const routeById = new Map(routeDefinitions.map((route) => [route.id, route]));

  async function ensureRouteView(routeId) {
    if (routeViews.has(routeId)) {
      return routeViews.get(routeId);
    }

    const route = routeById.get(routeId);
    if (!route) {
      throw new Error(`Unknown route "${routeId}".`);
    }

    const view = await route.create();
    view.element.hidden = true;
    routeViews.set(routeId, view);
    return view;
  }

  function hideAllViews() {
    for (const view of routeViews.values()) {
      view.element.hidden = true;
    }

    if (settingsPanel) {
      settingsPanel.hidden = true;
    }
  }

  function isSettingsOpen() {
    return Boolean(settingsPanel && !settingsPanel.hidden);
  }

  async function showRoute(routeId) {
    const view = await ensureRouteView(routeId);

    // Detach the native BrowserView before hiding the chat panel so it stops
    // painting over whatever panel the user is switching to.
    if (activeRouteId === 'chat' && routeId !== 'chat') {
      chatView?.pauseBrowserPreview();
    }

    hideAllViews();
    view.element.hidden = false;
    activeRouteId = routeId;
    sidebarAvatar.classList.remove('chat-sidebar__avatar--active');

    // Re-attach and re-sync the native BrowserView now that chat is visible.
    if (routeId === 'chat') {
      chatView?.resumeBrowserPreview();
    }

    const tab = tabElements.get(routeId);
    if (tab && tab !== activeTabEl) {
      activeTabEl?.classList.remove('chat-sidebar__tab--active');
      tab.classList.add('chat-sidebar__tab--active');
      activeTabEl = tab;
      moveIndicatorToTab(tab, true);
    }

    await view.onShow?.();
  }

  // ── Avatar sync ───────────────────────────────────────────────────────────
  // Keeps the sidebar button in sync with the current profile.
  // Shows a photo when profile.avatarPath is set; falls back to initials.

  function syncAvatar() {
    if (profile.avatarPath) {
      // Build a cache-busted URL so the browser reloads when the file changes
      // (the destination path is always Data/Avatar.<ext>).
      const src = toFileUrl(profile.avatarPath) + '?t=' + Date.now();

      if (avatarImg) {
        avatarImg.src = src;
      } else {
        // First time switching from initials → photo
        avatarImg = createElement('img', 'chat-sidebar__avatar-img');
        avatarImg.src = src;
        avatarImg.alt = '';
        sidebarAvatar.replaceChildren(avatarImg);
        avatarInitials = null;
      }
    } else {
      if (avatarImg) {
        // Switching from photo → initials
        avatarInitials = createElement(
          'span',
          'chat-sidebar__avatar-initials',
          getInitials(profile.name),
        );
        sidebarAvatar.replaceChildren(avatarInitials);
        avatarImg = null;
      } else if (avatarInitials) {
        // Just updating the name initials
        avatarInitials.textContent = getInitials(profile.name);
      }
    }
  }

  async function showSettingsPanel() {
    if (activeRouteId === 'chat') {
      chatView?.pauseBrowserPreview();
    }

    hideAllViews();

    if (!settingsPanel) {
      settingsPanel = buildSettingsPanel();
      canvas.append(settingsPanel);
    }

    settingsPanel.hidden = false;
    sidebarAvatar.classList.add('chat-sidebar__avatar--active');
  }

  function buildSettingsPanel() {
    const panel = createElement('div', 'chat-settings');
    const header = createElement('div', 'chat-settings__header');
    const body = createElement('div', 'chat-settings__body');
    const nav = createElement('nav', 'chat-settings__nav');
    const navItems = createElement('div', 'chat-settings__nav-items');
    const main = createElement('div', 'chat-settings__main');
    const mainHeading = createElement('h2', 'chat-settings__main-heading');

    const pageLabels = {
      user: strings.settings.nav.user,
      app: strings.settings.nav.app,
      channels: strings.settings.nav.channels,
      connectors: strings.settings.nav.connectors,
      providers: strings.settings.nav.providers,
      appearance: strings.settings.nav.appearance,
      mcp: strings.settings.nav.mcp,
      shortcuts: strings.settings.nav.shortcuts,
      slashCommands: strings.settings.nav.slashCommands,
      security: strings.settings.nav.security,
      about: strings.settings.nav.about,
    };

    header.append(createElement('h2', 'chat-settings__title', strings.settings.title));

    async function activateSubMenu(id) {
      navItems.querySelectorAll('.chat-settings__nav-item').forEach((item) => {
        item.classList.toggle('chat-settings__nav-item--active', item._settingsSubId === id);
      });

      mainHeading.textContent = pageLabels[id] ?? '';
      if (id === 'about') {
        main.replaceChildren();
      } else {
        main.replaceChildren(mainHeading);
      }

      if (id === 'user') {
        main.append(
          createUserPanel(strings.user, {
            getProfile: () => profile,
            onProfileSaved: (savedProfile) => {
              profile = savedProfile ?? profile;
              syncAvatar();
            },
            onAvatarChanged: (avatarPath) => {
              profile = { ...profile, avatarPath };
              syncAvatar();
            },
          }),
        );
      }

      if (id === 'app') {
        main.append(createAppSettingsPanel(strings.appSettings));
      }

      if (id === 'channels') {
        const panel = createChannelsPanel(strings.channels);
        const element = panel.build();
        element.hidden = false;
        main.append(element);
        await panel.populate();
      }

      if (id === 'providers') {
        const panel = createProvidersPanel(strings.providers);
        main.append(panel.build());
        await panel.populate();
      }

      if (id === 'connectors') {
        const panel = createConnectorsPanel(strings.connectors);
        main.append(panel.build());
        await panel.populate();
      }

      if (id === 'shortcuts') {
        main.append(createShortcutsPanel(strings.shortcuts));
      }

      if (id === 'slashCommands') {
        main.append(await createSlashCommandsPanel(strings.slashCommands.panel));
      }

      if (id === 'appearance') {
        main.append(createThemePanel(strings.themes));
      }
      if (id === 'mcp') {
        main.append(createMCPPanel(strings.mcp));
      }
      if (id === 'security') {
        main.append(
          createSecurityPanel(strings.security, {
            onSecurityChanged: () => {
              void autoLockTimer.refresh();
            },
          }),
        );
      }

      if (id === 'about') {
        const aboutPanel = createAboutPanel(strings.about);
        main.append(aboutPanel.element);
        await aboutPanel.populate();
      }
    }

    for (const menu of [
      { id: 'user', label: strings.settings.nav.user, icon: iconMarkup.tabPersonas },
      { id: 'app', label: strings.settings.nav.app, icon: iconMarkup.power },
      { id: 'channels', label: strings.settings.nav.channels, icon: iconMarkup.tabChannels },
      { id: 'connectors', label: strings.settings.nav.connectors, icon: iconMarkup.network },
      { id: 'providers', label: strings.settings.nav.providers, icon: iconMarkup.verified },
      { id: 'appearance', label: strings.settings.nav.appearance, icon: iconMarkup.palette },
      { id: 'mcp', label: strings.settings.nav.mcp, icon: iconMarkup.network },
      { id: 'shortcuts', label: strings.settings.nav.shortcuts, icon: iconMarkup.keyboard },
      { id: 'slashCommands', label: strings.settings.nav.slashCommands, icon: iconMarkup.terminal },
      { id: 'security', label: strings.settings.nav.security, icon: iconMarkup.lock },
      { id: 'about', label: strings.settings.nav.about, icon: iconMarkup.info },
    ]) {
      const item = createElement('button', 'chat-settings__nav-item');
      item.type = 'button';
      item._settingsSubId = menu.id;
      const iconEl = createElement('span', 'chat-settings__nav-item-icon');
      iconEl.innerHTML = menu.icon;
      item.append(iconEl, createElement('span', 'chat-settings__nav-item-label', menu.label));
      item.addEventListener('click', () => {
        void activateSubMenu(menu.id);
      });
      navItems.append(item);
    }

    nav.append(navItems);
    body.append(nav, main);
    panel.append(header, body);
    void activateSubMenu('user');
    return panel;
  }

  sidebarTabs.append(tabIndicator);

  for (const route of routeDefinitions) {
    const isActive = route.id === activeRouteId;
    const tab = createElement(
      'button',
      `chat-sidebar__tab${isActive ? ' chat-sidebar__tab--active' : ''}`,
    );
    tab.type = 'button';
    tab.setAttribute('aria-label', strings.tabs[route.id]);
    tab.append(createIcon(route.icon, 'chat-sidebar__tab-icon'));
    tab.addEventListener('click', () => {
      if (route.id === activeRouteId && isSettingsOpen()) {
        void showRoute(route.id);
        return;
      }

      if (route.id !== activeRouteId || isSettingsOpen()) {
        void showRoute(route.id);
        return;
      }

      if (route.id === 'chat') {
        chatView?.clearConversation();
      }
    });

    tabElements.set(route.id, tab);
    if (isActive) {
      activeTabEl = tab;
    }
    sidebarTabs.append(tab);
  }

  const avatarDivider = createElement('div', 'chat-sidebar__avatar-divider');
  const sidebarAvatar = createElement('button', 'chat-sidebar__avatar');
  sidebarAvatar.type = 'button';
  sidebarAvatar.setAttribute('aria-label', strings.profile);

  // Initial render — show photo if we already have one, otherwise initials.
  if (profile.avatarPath) {
    avatarImg = createElement('img', 'chat-sidebar__avatar-img');
    avatarImg.src = toFileUrl(profile.avatarPath);
    avatarImg.alt = '';
    sidebarAvatar.append(avatarImg);
  } else {
    avatarInitials = createElement(
      'span',
      'chat-sidebar__avatar-initials',
      getInitials(profile.name),
    );
    sidebarAvatar.append(avatarInitials);
  }

  sidebarAvatar.addEventListener('click', () => {
    if (settingsPanel && !settingsPanel.hidden) {
      void showRoute(activeRouteId);
    } else {
      void showSettingsPanel();
    }
  });

  sidebarTabs.append(avatarDivider, sidebarAvatar);
  sidebar.append(sidebarTabs);
  canvas.append(dragRegion);
  stage.append(canvas);
  shell.append(sidebar, stage);
  root.replaceChildren(shell);

  // Dismiss the boot loader now that the shell is in the DOM.
  // Fire-and-forget: fade out over 300ms then remove.
  const bootLoader = document.getElementById('boot-loader');
  if (bootLoader) {
    bootLoader.style.transition = 'opacity 300ms ease';
    bootLoader.style.opacity = '0';
    setTimeout(() => bootLoader.remove(), 300);
  }

  await showRoute(appSettings.defaultView ?? 'chat');
  requestAnimationFrame(() => moveIndicatorToTab(activeTabEl, false));

  // ── Birthday card ──────────────────────────────────────────────────────────
  // Checks today's date against the user's date of birth and shows a
  // celebratory overlay with confetti when it's a match. No-ops silently
  // when it isn't the user's birthday.
  mountBirthdayCard(strings.user.birthday, { profile });

  // Arm the auto-lock timer now that the shell is fully rendered.
  void autoLockTimer.refresh();

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // Registered after the initial route is shown so all route creators exist.
  // Ctrl+key and Ctrl+Shift+key combos fire regardless of focus so they work
  // even when the chat composer textarea is active.
  registerShortcuts([
    {
      id: 'newChat',
      combo: { ctrl: true, key: 'n' },
      handler: async () => {
        const chat = await ensureChatView();
        chat.clearConversation();
        await showRoute('chat');
        chat.focusComposer();
      },
    },
    {
      id: 'history',
      combo: { ctrl: true, key: 'h' },
      handler: () => {
        void showRoute('history');
      },
    },
    {
      id: 'events',
      combo: { ctrl: true, key: 'e' },
      handler: () => {
        void showRoute('events');
      },
    },
    {
      id: 'projects',
      combo: { ctrl: true, shift: true, key: 'r' },
      handler: () => {
        void showRoute('projects');
      },
    },
    {
      id: 'memory',
      combo: { ctrl: true, shift: true, key: 'm' },
      handler: () => {
        void showRoute('memory');
      },
    },
    {
      id: 'templates',
      combo: { ctrl: true, key: 't' },
      handler: () => {
        void showRoute('templates');
      },
    },
    {
      id: 'agents',
      combo: { ctrl: true, shift: true, key: 'g' },
      handler: () => {
        void showRoute('agents');
      },
    },
    {
      id: 'skills',
      combo: { ctrl: true, shift: true, key: 's' },
      handler: () => {
        void showRoute('skills');
      },
    },
    {
      id: 'personas',
      combo: { ctrl: true, shift: true, key: 'p' },
      handler: () => {
        void showRoute('personas');
      },
    },
    {
      id: 'marketplace',
      combo: { ctrl: true, key: 'm' },
      handler: () => {
        void showRoute('marketplace');
      },
    },
    {
      id: 'usage',
      combo: { ctrl: true, key: 'u' },
      handler: () => {
        void showRoute('usage');
      },
    },
    {
      id: 'settings',
      combo: { ctrl: true, key: ',' },
      handler: () => {
        void showSettingsPanel();
      },
    },
    {
      id: 'channels',
      combo: { ctrl: true, shift: true, key: 'l' },
      handler: () => {
        void showSettingsPanel();
      },
    },
  ]);
}

bootstrap().catch((error) => {
  console.error('[Joanium] Shell failed to boot:', error);
});
