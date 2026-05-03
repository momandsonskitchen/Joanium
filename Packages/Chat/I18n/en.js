const en = {
  appName: 'Joanium',
  tabs: {
    chat: 'Chat',
    colab: 'Colab',
    code: 'Code'
  },
  actions: {
    newChat: 'New chat',
    search: 'Search',
    customize: 'Customize'
  },
  navigation: {
    chats: 'Chats',
    projects: 'Projects',
    tasks: 'Tasks',
    agents: 'Agents',
    companies: 'Companies'
  },
  sections: {
    quickStart: 'Quick Start'
  },
  greeting: {
    morning: 'Good morning, {name}',
    afternoon: 'Good afternoon, {name}',
    evening: 'Good evening, {name}'
  },
  composer: {
    placeholder: 'How can I help you today?',
    modelFallback: 'Ready to chat',
    stop: 'Stop',
    generationStopped: 'Generation stopped.'
  },
  quickStartCards: [
    {
      id: 'write-script',
      icon: 'code',
      title: 'Write a script',
      summary: 'Write a TypeScript script that fetches data from an API and processes it.',
      prompt:
        'Write a TypeScript script that fetches paginated API data, validates each record, and saves a cleaned JSON export.'
    },
    {
      id: 'analyze-document',
      icon: 'document',
      title: 'Analyze document',
      summary: 'Analyze this document and provide a comprehensive summary with key insights.',
      prompt:
        'Analyze this document, summarize the main arguments, list the risks, and extract the actions I should take next.'
    },
    {
      id: 'brainstorm-ideas',
      icon: 'spark',
      title: 'Brainstorm ideas',
      summary: 'Brainstorm 10 innovative product ideas for AI-powered tools in 2026.',
      prompt:
        'Brainstorm 10 practical AI product ideas for normal people, rank them by usefulness, and explain why each one would get repeated use.'
    },
    {
      id: 'research-topic',
      icon: 'globe',
      title: 'Research topic',
      summary: 'Provide a comprehensive research overview on quantum computing and its applications.',
      prompt:
        'Research a topic deeply, explain the current landscape in plain English, and give me the key tradeoffs, risks, and next steps.'
    }
  ]
};

export default en;
