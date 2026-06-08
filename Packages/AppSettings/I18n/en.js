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
      { value: 'google', label: 'Google', iconPath: 'app://assets/Icons/Google.png' },
      { value: 'bing', label: 'Bing', iconPath: 'app://assets/Icons/Bing.png' },
      { value: 'duckduckgo', label: 'DuckDuckGo', iconPath: 'app://assets/Icons/DuckDuckGo.png' },
      { value: 'yandex', label: 'Yandex', iconPath: 'app://assets/Icons/Yandex.png' },
      { value: 'yahoo', label: 'Yahoo', iconPath: 'app://assets/Icons/Yahoo.png' },
      { value: 'brave', label: 'Brave Search', iconPath: 'app://assets/Icons/Brave.png' },
      { value: 'ecosia', label: 'Ecosia', iconPath: 'app://assets/Icons/Ecosia.png' },
      { value: 'kagi', label: 'Kagi', iconPath: 'app://assets/Icons/Kagi.png' },
      { value: 'perplexity', label: 'Perplexity', iconPath: 'app://assets/Icons/Perplexity.png' },
      { value: 'startpage', label: 'Startpage', iconPath: 'app://assets/Icons/Startpage.png' },
      { value: 'baidu', label: 'Baidu', iconPath: 'app://assets/Icons/Baidu.png' },
      { value: 'naver', label: 'Naver', iconPath: 'app://assets/Icons/Naver.png' },
      { value: 'qwant', label: 'Qwant', iconPath: 'app://assets/Icons/Qwant.png' },
      { value: 'swisscows', label: 'Swisscows', iconPath: 'app://assets/Icons/Swisscows.png' },
      {
        value: 'wolframalpha',
        label: 'Wolfram|Alpha',
        iconPath: 'app://assets/Icons/WolframAlpha.png',
      },
      { value: 'ask', label: 'Ask', iconPath: 'app://assets/Icons/Ask.png' },
      { value: 'aol', label: 'AOL Search', iconPath: 'app://assets/Icons/AOL.png' },
      { value: 'dogpile', label: 'Dogpile', iconPath: 'app://assets/Icons/DogPile.png' },
      { value: 'mojeek', label: 'Mojeek', iconPath: 'app://assets/Icons/Mojeek.png' },
      { value: 'you', label: 'You.com', iconPath: 'app://assets/Icons/You.png' },
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
  dataPortability: {
    title: 'Data portability',
    export: {
      label: (personaName) => `Export ${personaName}`,
      description:
        'Save all your data — chats, agents, memory, projects, and settings — as a zip file you can restore later.',
      button: (personaName) => `Export ${personaName}`,
      exporting: 'Exporting...',
      success: 'Exported successfully.',
      failed: 'Export failed. Please try again.',
    },
    import: {
      label: 'Import backup',
      description:
        'Restore data from a previously exported Joanium.zip. Existing data is kept — only missing items are added.',
      button: 'Import Backup',
      importing: 'Importing...',
      success: 'Import complete. Your data has been merged.',
      failed: 'Import failed. Make sure the file is a valid Joanium backup.',
    },
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
