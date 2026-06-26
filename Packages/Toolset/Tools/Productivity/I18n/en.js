const productivityStrings = {
  connectors: [
    {
      id: 'airtable',
      label: 'Airtable',
      description: 'Read and create Airtable records through the Web API.',
      credentialKey: 'token',
      fields: [
        {
          key: 'token',
          label: 'Personal access token',
          placeholder: 'Airtable PAT',
          type: 'password',
          required: true,
        },
        {
          key: 'baseId',
          label: 'Default base ID',
          placeholder: 'app...',
          type: 'text',
          required: false,
        },
      ],
      optional: false,
    },
    {
      id: 'todoist',
      label: 'Todoist',
      description: 'Find, add, and complete Todoist tasks through the current API.',
      credentialLabel: 'API token',
      credentialPlaceholder: 'Todoist API token',
      credentialKey: 'token',
      optional: false,
    },
  ],
  tools: [
    {
      name: 'airtable_list_records',
      description: 'List records from an Airtable table.',
      category: 'airtable',
      parameters: {
        table: { type: 'string', required: true, description: 'Table name or table ID.' },
        base_id: {
          type: 'string',
          required: false,
          description: 'Base ID. Uses the saved default base ID when omitted.',
        },
        view: { type: 'string', required: false, description: 'Optional Airtable view name.' },
        max_records: {
          type: 'number',
          required: false,
          description: 'Maximum records to return, default 10, max 100.',
        },
      },
    },
    {
      name: 'airtable_create_record',
      description: 'Create one record in an Airtable table from a JSON object of fields.',
      category: 'airtable',
      parameters: {
        table: { type: 'string', required: true, description: 'Table name or table ID.' },
        fields: {
          type: 'object',
          required: true,
          description: 'Record fields as an object or JSON object string.',
        },
        base_id: {
          type: 'string',
          required: false,
          description: 'Base ID. Uses the saved default base ID when omitted.',
        },
        typecast: {
          type: 'boolean',
          required: false,
          description: 'Whether Airtable should typecast field values.',
        },
      },
    },
    {
      name: 'todoist_filter_tasks',
      description: 'Find Todoist tasks with a Todoist filter query.',
      category: 'todoist',
      parameters: {
        query: { type: 'string', required: true, description: 'Todoist filter query.' },
        lang: { type: 'string', required: false, description: 'Filter language, default en.' },
        limit: { type: 'number', required: false, description: 'Result count, default 20.' },
      },
    },
    {
      name: 'todoist_quick_add',
      description: 'Create a Todoist task using Quick Add natural-language syntax.',
      category: 'todoist',
      parameters: {
        text: { type: 'string', required: true, description: 'Quick Add task text.' },
        note: { type: 'string', required: false, description: 'Optional task note.' },
        reminder: { type: 'string', required: false, description: 'Optional reminder text.' },
      },
    },
    {
      name: 'todoist_close_task',
      description: 'Complete a Todoist task by task ID.',
      category: 'todoist',
      parameters: {
        task_id: { type: 'string', required: true, description: 'Todoist task ID.' },
      },
    },
  ],
  labels: {
    baseId: 'base_id',
    content: 'content',
    fields: 'fields',
    query: 'query',
    table: 'table',
    taskId: 'task_id',
    text: 'text',
  },
  errors: {
    missingParameter: 'Missing required parameter: {label}.',
    invalidJsonObject: 'Expected {label} to be a JSON object.',
    missingAirtableBase: 'Airtable base ID is required. Save a default base ID or pass base_id.',
    requestFailed: '{service} request failed.',
  },
  output: {
    airtableCreated: 'Airtable record created',
    airtableRecords: 'Airtable records',
    noResults: 'No results found.',
    todoistClosed: 'Todoist task completed',
    todoistCreated: 'Todoist task created.',
    todoistTasks: 'Todoist tasks',
    chat: 'Chat',
    created: 'Created',
    due: 'Due',
    emptyObject: '{}',
    id: 'ID',
    name: 'Name',
    notAvailable: 'n/a',
    project: 'Project',
    timestamp: 'Timestamp',
  },
};

export default productivityStrings;
