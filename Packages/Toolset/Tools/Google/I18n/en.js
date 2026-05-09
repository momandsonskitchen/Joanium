const googleStrings = {
  connector: {
    id: 'google',
    label: 'Google Workspace',
    description: 'Gmail, Drive, Calendar, and account lookups through Google APIs using an OAuth access token.',
    credentialKey: 'accessToken',
    optional: false,
    fields: [
      {
        key: 'accessToken',
        label: 'OAuth access token',
        placeholder: 'ya29...',
        type: 'password',
        required: true
      }
    ]
  },
  tools: [
    {
      name: 'google_get_profile',
      description: 'Get the Google profile for the configured access token.',
      category: 'google',
      parameters: {}
    },
    {
      name: 'gmail_search_emails',
      description: 'Search Gmail messages.',
      category: 'google',
      parameters: {
        query: { type: 'string', required: true, description: 'Gmail search query.' },
        limit: { type: 'number', required: false, description: 'Maximum messages, default 10, max 25.' }
      }
    },
    {
      name: 'gmail_get_message',
      description: 'Get a Gmail message by ID.',
      category: 'google',
      parameters: {
        message_id: { type: 'string', required: true, description: 'Gmail message ID.' }
      }
    },
    {
      name: 'drive_list_files',
      description: 'List recent Google Drive files.',
      category: 'google',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum files, default 10, max 25.' }
      }
    },
    {
      name: 'drive_search_files',
      description: 'Search Google Drive files.',
      category: 'google',
      parameters: {
        query: { type: 'string', required: true, description: 'Drive search text.' },
        limit: { type: 'number', required: false, description: 'Maximum files, default 10, max 25.' }
      }
    },
    {
      name: 'calendar_get_upcoming',
      description: 'List upcoming Google Calendar events from the primary calendar.',
      category: 'google',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum events, default 10, max 25.' }
      }
    },
    {
      name: 'calendar_search_events',
      description: 'Search Google Calendar events in the primary calendar.',
      category: 'google',
      parameters: {
        query: { type: 'string', required: true, description: 'Calendar event search text.' },
        limit: { type: 'number', required: false, description: 'Maximum events, default 10, max 25.' }
      }
    }
  ]
};

export default googleStrings;
