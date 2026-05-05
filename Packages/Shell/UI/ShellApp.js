import strings from '../I18n/en.js';
import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon, iconMarkup } from '../../Shared/Icons/Icons.js';
import { createChatView } from '../../Chat/UI/ChatApp.js';
import { createHistoryPanel } from '../../History/UI/HistoryPanel.js';
import { createProjectsPanel } from '../../Projects/UI/ProjectsPanel.js';
import { createTemplatesPanel } from '../../Templates/UI/TemplatesPanel.js';
import { createAgentsPanel } from '../../Agents/UI/AgentsPanel.js';
import { createSkillsPanel } from '../../Skills/UI/SkillsPanel.js';
import { createPersonasPanel } from '../../Personas/UI/PersonasPanel.js';
import { createMarketplacePanel } from '../../Marketplace/UI/MarketplacePanel.js';
import { createUserPanel } from '../../User/UI/UserPanel.js';
import { createAboutPanel } from '../../About/UI/AboutPanel.js';

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

async function bootstrap() {
  const payload = await invokeIpc('shell:bootstrap');
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
  let activeRouteId = 'chat';
  let activeTabEl = null;
  let chatView = null;
  let settingsPanel = null;
  let avatarInitials = null;

  const routeViews = new Map();
  const tabElements = new Map();

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
    activeProject = project ? {
      id: project.id,
      name: project.name ?? '',
      icon: project.icon ?? '',
      info: project.info ?? '',
      coverImagePath: project.coverImagePath ?? ''
    } : null;

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
        getProfile: () => profile
      });
      canvas.append(chatView.element);
      routeViews.set('chat', {
        element: chatView.element,
        onShow: () => chatView.focusComposer()
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
      }
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
          getActiveProject: () => activeProject
        });
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: async () => {
            element._search.clear();
            await panel.populateList(element._contentEl);
          }
        };
      }
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
          getActiveProject: () => activeProject
        });
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim())
        };
      }
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
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim())
        };
      }
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
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim())
        };
      }
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
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim())
        };
      }
    },
    {
      id: 'personas',
      icon: 'tabPersonas',
      create: async () => {
        const panel = createPersonasPanel(strings.personas, {
          getActivePersona: () => activePersona,
          onActivatePersona: setActivePersona
        });
        const element = panel.build();
        canvas.append(element);
        return {
          element,
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim())
        };
      }
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
          onShow: () => panel.populateList(element._listEl, element._search.getValue().trim())
        };
      }
    }
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
    hideAllViews();
    view.element.hidden = false;
    activeRouteId = routeId;
    sidebarAvatar.classList.remove('chat-sidebar__avatar--active');

    const tab = tabElements.get(routeId);
    if (tab && tab !== activeTabEl) {
      activeTabEl?.classList.remove('chat-sidebar__tab--active');
      tab.classList.add('chat-sidebar__tab--active');
      activeTabEl = tab;
      moveIndicatorToTab(tab, true);
    }

    await view.onShow?.();
  }

  function syncAvatar() {
    if (avatarInitials) {
      avatarInitials.textContent = getInitials(profile.name);
    }
  }

  async function showSettingsPanel() {
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

    header.append(createElement('h2', 'chat-settings__title', strings.settings.title));

    async function activateSubMenu(id) {
      navItems.querySelectorAll('.chat-settings__nav-item').forEach((item) => {
        item.classList.toggle('chat-settings__nav-item--active', item.dataset.subId === id);
      });

      main.replaceChildren();

      if (id === 'user') {
        main.append(createUserPanel(strings.user, {
          getProfile: () => profile,
          onProfileSaved: (savedProfile) => {
            profile = savedProfile ?? profile;
            syncAvatar();
          }
        }));
      }

      if (id === 'about') {
        const aboutPanel = createAboutPanel(strings.about);
        main.append(aboutPanel.element);
        await aboutPanel.populate();
      }
    }

    for (const menu of [
      { id: 'user', label: strings.settings.nav.user, icon: iconMarkup.tabPersonas },
      { id: 'about', label: strings.settings.nav.about, icon: iconMarkup.info }
    ]) {
      const item = createElement('button', 'chat-settings__nav-item');
      item.type = 'button';
      item.dataset.subId = menu.id;
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
      `chat-sidebar__tab${isActive ? ' chat-sidebar__tab--active' : ''}`
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
  avatarInitials = createElement('span', 'chat-sidebar__avatar-initials', getInitials(profile.name));
  sidebarAvatar.append(avatarInitials);
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

  await showRoute('chat');
  requestAnimationFrame(() => moveIndicatorToTab(activeTabEl, false));
}

bootstrap().catch((error) => {
  console.error('[Joanium] Shell failed to boot:', error);
});
