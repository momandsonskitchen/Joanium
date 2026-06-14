const en = {
  saved: 'Saved',
  saveFailed: 'Could not update this setting.',
  options: {
    runOnStartup: {
      label: 'Open at login',
      description: 'Start Joanium automatically when you sign in.',
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
    showChangelog: {
      label: 'Show changelog on update',
      description: 'Show the "What\'s New" in Joanium after the update to a new version.',
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
      { value: 'baidu', label: 'Baidu' },
      { value: 'naver', label: 'Naver' },
      { value: 'qwant', label: 'Qwant' },
      { value: 'swisscows', label: 'Swisscows' },
      { value: 'wolframalpha', label: 'Wolfram|Alpha' },
      { value: 'ask', label: 'Ask' },
      { value: 'aol', label: 'AOL Search' },
      { value: 'dogpile', label: 'Dogpile' },
      { value: 'mojeek', label: 'Mojeek' },
      { value: 'you', label: 'You.com' },
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
        'Restore data from a previously exported Joanium.zip. Backed-up files are restored and profile settings are merged.',
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
