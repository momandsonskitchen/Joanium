const en = {
  title: 'App',
  subtitle: 'Control how Joanium behaves outside the chat window.',
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
    autoMemoryUpdates: {
      label: 'Auto memory updates',
      description: 'Let Joanium update personal memory from completed conversations while idle.',
    },
    autoUpdate: {
      label: 'App auto update',
      description: 'Check for signed releases and download updates automatically when packaged.',
    },
  },
  defaultView: {
    label: 'Default view',
    description: 'The view shown when Joanium opens.',
    views: {
      chat: 'Chat',
      history: 'History',
      projects: 'Projects',
      agents: 'Agents',
      skills: 'Skills',
      personas: 'Personas',
      marketplace: 'Marketplace',
      events: 'Events',
      usage: 'Usage',
    },
  },
  defaultModel: {
    label: 'Default model',
    description: 'The AI model used by default when starting a new conversation.',
  },
  runtime: {
    title: 'Runtime',
    tray: 'Tray',
    keepAwake: 'Keep awake',
    autoUpdate: 'Auto update',
    active: 'Active',
    inactive: 'Inactive',
    checking: 'Checking',
    current: 'Current',
    disabled: 'Disabled',
    unavailable: 'Unavailable in development',
    ready: 'Ready to install on quit',
    downloading: 'Downloading {percent}%',
    error: 'Needs attention',
  },
};

export default en;
