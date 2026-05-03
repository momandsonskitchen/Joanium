const en = {
  appName: 'Joanium',
  tabs: {
    chats: 'Chats',
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
    recents: 'Recents',
    quickStart: 'Quick Start'
  },
  greeting: {
    morning: 'Good morning, {name}',
    afternoon: 'Good afternoon, {name}',
    evening: 'Good evening, {name}'
  },
  plan: {
    tier: 'Pro Plan',
    upgrade: 'Upgrade'
  },
  composer: {
    placeholder: 'How can I help you today?',
    modelFallback: 'Ready to chat'
  },
  profile: {
    local: 'Ready for local work',
    configured: 'Configured with {provider}'
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
  ],
  suggestedRecents: [
    {
      id: 'research-transformers',
      modes: ['research', 'default'],
      title: 'Neural architecture analysis',
      summary: 'Comparing transformer variants for sequence-heavy workflows and long context tasks.',
      prompt:
        'Compare leading transformer variants for long-context work, summarize where each one wins, and recommend the best fit for analysis-heavy workflows.'
    },
    {
      id: 'build-dashboard',
      modes: ['data', 'coding', 'default'],
      title: 'Build a React dashboard',
      summary: 'Full analytics dashboard with real-time charts, filters, and KPI summaries.',
      prompt:
        'Design a product plan for an analytics dashboard with real-time KPIs, flexible filtering, and a clean information hierarchy.'
    },
    {
      id: 'explain-entanglement',
      modes: ['research', 'learning', 'default'],
      title: 'Explain quantum entanglement',
      summary: 'A simplified explanation for software-minded people without losing the real physics.',
      prompt:
        'Explain quantum entanglement to a software engineer with analogies that stay accurate enough to be useful.'
    },
    {
      id: 'product-copy',
      modes: ['marketing', 'writing', 'default'],
      title: 'Product copy generator',
      summary: 'AI-powered marketing copy for SaaS landing pages, ads, and launch emails.',
      prompt:
        'Write high-conversion landing page copy for a SaaS product, including headline options, benefits, proof points, and CTAs.'
    },
    {
      id: 'design-aesthetic',
      modes: ['designing', 'default'],
      title: 'Analyze my design aesthetic',
      summary: 'Visual analysis and recommendations for a cleaner, more premium product style.',
      prompt:
        'Review my product design direction, identify what looks generic, and suggest changes that feel more premium and distinctive.'
    },
    {
      id: 'dataset-insights',
      modes: ['data', 'research'],
      title: 'Find hidden dataset signals',
      summary: 'Spot anomalies, clusters, and questions worth investigating before building a model.',
      prompt:
        'Help me inspect a dataset, identify anomalies and patterns, and decide what I should investigate before modeling.'
    },
    {
      id: 'personal-automation',
      modes: ['productivity', 'coding'],
      title: 'Personal workflow automations',
      summary: 'Practical automations that save time every week without becoming maintenance traps.',
      prompt:
        'List workflow automations a normal person will actually use weekly, rank them by savings, and explain the setup effort.'
    }
  ]
};

export default en;
