const en = {
  saved: 'Saved',
  saveFailed: 'Could not update this setting.',
  options: {
    runOnStartup: {
      label: 'Open at login',
      description: 'Start Joanium automatically when you sign in.',
    },
    systemTray: {
      label: 'Keep in system tray',
      description: 'Keep Joanium running after the last window is closed.',
    },
    keepAwake: {
      label: 'Keep awake',
      description: 'Prevent the app process from being suspended while Joanium is running.',
    },
    completionSound: {
      label: 'Completion sound',
      description: 'Play a sound when a response finishes.',
    },
    showTechFeed: {
      label: 'Show tech feed',
      description: 'Show trending repositories and developer news on the welcome screen.',
    },
    autoMemoryUpdates: {
      label: 'Auto memory updates',
      description: 'Let Joanium update personal memory from completed conversations while idle.',
    },
    autoUpdate: {
      label: 'App auto update',
      description: 'Check for packaged app updates and download them when available.',
    },
  },
  defaultView: {
    label: 'Default view',
    description: 'The view shown when Joanium opens.',
    views: {
      chat: 'Chat',
      history: 'History',
      projects: 'Projects',
      memory: 'Memory',
      templates: 'Templates',
      agents: 'Agents',
      skills: 'Skills',
      personas: 'Personas',
      marketplace: 'Marketplace',
      events: 'Events',
      usage: 'Usage',
    },
  },
  defaultSearchEngine: {
    label: 'Default search engine',
    description: 'The search engine opened when you launch the browser from the composer.',
    options: [
      { value: 'google', label: 'Google' },
      { value: 'bing', label: 'Bing' },
      { value: 'duckduckgo', label: 'DuckDuckGo' },
      { value: 'yandex', label: 'Yandex' },
      { value: 'yahoo', label: 'Yahoo' },
      { value: 'brave', label: 'Brave Search' },
      { value: 'ecosia', label: 'Ecosia' },
      { value: 'kagi', label: 'Kagi' },
      { value: 'perplexity', label: 'Perplexity' },
      { value: 'startpage', label: 'Startpage' },
    ],
  },
  defaultModel: {
    label: 'Default model',
    description: 'The AI model used by default when starting a new conversation.',
  },
  updateMemory: {
    label: 'Update memory now',
    description: 'Manually run memory learning on recent conversations.',
    button: 'Update Memory',
    updating: 'Updating...',
  },
  reset: {
    title: 'Danger zone',
    label: 'Reset Joanium',
    description: 'Clear chats, projects, channels, agents, memory, providers, usage, and settings.',
    warning: 'This cannot be undone. The app will relaunch after reset.',
    button: 'Reset',
    confirm: 'Confirm reset',
    resetting: 'Resetting...',
    failed: 'Could not reset the app.',
  },
};

export default en;
