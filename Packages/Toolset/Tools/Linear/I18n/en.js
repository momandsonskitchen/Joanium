const linearStrings = {
  connector: {
    id: 'linear',
    label: 'Linear',
    description: 'Issues, teams, projects, and comments through the Linear GraphQL API.',
    credentialLabel: 'Personal API key',
    credentialPlaceholder: 'lin_api_...',
    credentialKey: 'token',
    optional: false,
  },
  tools: [
    {
      name: 'linear_get_viewer',
      description: 'Get the authenticated Linear user.',
      category: 'linear',
      parameters: {},
    },
    {
      name: 'linear_list_teams',
      description: 'List Linear teams.',
      category: 'linear',
      parameters: {
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum teams, default 25, max 50.',
        },
      },
    },
    {
      name: 'linear_list_my_issues',
      description: 'List Linear issues assigned to the authenticated user.',
      category: 'linear',
      parameters: {
        state: { type: 'string', required: false, description: 'Optional state name filter.' },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum issues, default 10, max 25.',
        },
      },
    },
    {
      name: 'linear_search_issues',
      description: 'Search Linear issues.',
      category: 'linear',
      parameters: {
        query: { type: 'string', required: true, description: 'Search query.' },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum issues, default 10, max 25.',
        },
      },
    },
    {
      name: 'linear_get_issue',
      description: 'Get a Linear issue by ID or identifier.',
      category: 'linear',
      parameters: {
        issue_id: {
          type: 'string',
          required: true,
          description: 'Issue UUID or identifier such as ENG-123.',
        },
      },
    },
    {
      name: 'linear_create_issue',
      description: 'Create a Linear issue.',
      category: 'linear',
      parameters: {
        team_id: { type: 'string', required: true, description: 'Linear team ID.' },
        title: { type: 'string', required: true, description: 'Issue title.' },
        description: { type: 'string', required: false, description: 'Issue description.' },
        priority: { type: 'number', required: false, description: 'Priority 0-4.' },
      },
    },
    {
      name: 'linear_add_comment',
      description: 'Add a comment to a Linear issue.',
      category: 'linear',
      parameters: {
        issue_id: { type: 'string', required: true, description: 'Issue UUID or identifier.' },
        body: { type: 'string', required: true, description: 'Comment body.' },
      },
    },
  ],
};

export default linearStrings;
