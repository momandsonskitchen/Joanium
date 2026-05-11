const en = {
  title: 'Events',
  subtitle: 'A live audit feed for agent runs and channel replies.',
  stats: {
    total: 'Total',
    success: 'Success',
    errors: 'Errors',
    sources: 'Sources'
  },
  filters: {
    all: 'All',
    channels: 'Channels',
    agents: 'Agents',
    errors: 'Errors'
  },
  actions: {
    refresh: 'Refresh',
    clear: 'Clear',
    clearAll: 'Clear event history'
  },
  states: {
    loading: 'Loading events...',
    empty: 'No events have been recorded yet.',
    noMatches: 'No events match this filter.',
    live: 'Live',
    selectedEmpty: 'Select an event to inspect the details.'
  },
  labels: {
    agent: 'Agent',
    channel: 'Channel',
    unknown: 'Unknown',
    inbound: 'Inbound',
    reply: 'Reply',
    prompt: 'Prompt',
    thinking: 'Thinking',
    response: 'Response',
    reasoning: 'Reasoning',
    error: 'Error',
    source: 'Source',
    status: 'Status',
    started: 'Started',
    finished: 'Finished',
    model: 'Model',
    provider: 'Provider',
    tokens: 'Tokens',
    conversation: 'Conversation',
    target: 'Target',
    externalId: 'Message ID'
  },
  status: {
    success: 'Success',
    error: 'Error',
    skipped: 'Skipped',
    running: 'Running',
    queued: 'Queued'
  },
  types: {
    agent: 'Agent run',
    channel: 'Channel reply'
  },
  channels: {
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    discord: 'Discord',
    slack: 'Slack'
  }
};

export default en;
