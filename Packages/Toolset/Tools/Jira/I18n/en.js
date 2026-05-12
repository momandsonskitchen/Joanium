const jiraStrings = {
  connector: {
    id: 'jira',
    label: 'Jira',
    description: 'Search, inspect, create, comment on, and transition Jira Cloud issues.',
    credentialKey: 'token',
    optional: false,
    fields: [
      {
        key: 'email',
        label: 'Atlassian email',
        placeholder: 'you@example.com',
        type: 'text',
        required: true,
      },
      {
        key: 'token',
        label: 'API token',
        placeholder: 'Atlassian API token',
        type: 'password',
        required: true,
      },
      {
        key: 'siteUrl',
        label: 'Jira site URL',
        placeholder: 'https://yourcompany.atlassian.net',
        type: 'text',
        required: true,
      },
    ],
  },
  tools: [
    {
      name: 'jira_get_myself',
      description: 'Get the authenticated Jira user.',
      category: 'jira',
      parameters: {},
    },
    {
      name: 'jira_search_issues',
      description: 'Search Jira issues with JQL.',
      category: 'jira',
      parameters: {
        jql: { type: 'string', required: true, description: 'Jira Query Language string.' },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum issues, default 10, max 50.',
        },
      },
    },
    {
      name: 'jira_get_issue',
      description: 'Get Jira issue details.',
      category: 'jira',
      parameters: {
        issue_key: { type: 'string', required: true, description: 'Issue key such as PROJ-123.' },
      },
    },
    {
      name: 'jira_create_issue',
      description: 'Create a Jira issue.',
      category: 'jira',
      parameters: {
        project_key: { type: 'string', required: true, description: 'Project key.' },
        summary: { type: 'string', required: true, description: 'Issue summary.' },
        issue_type: {
          type: 'string',
          required: false,
          description: 'Issue type name. Defaults to Task.',
        },
        description: { type: 'string', required: false, description: 'Plain text description.' },
      },
    },
    {
      name: 'jira_add_comment',
      description: 'Add a plain-text comment to a Jira issue.',
      category: 'jira',
      parameters: {
        issue_key: { type: 'string', required: true, description: 'Issue key.' },
        body: { type: 'string', required: true, description: 'Comment text.' },
      },
    },
    {
      name: 'jira_list_transitions',
      description: 'List available transitions for a Jira issue.',
      category: 'jira',
      parameters: {
        issue_key: { type: 'string', required: true, description: 'Issue key.' },
      },
    },
    {
      name: 'jira_transition_issue',
      description: 'Transition a Jira issue by transition ID.',
      category: 'jira',
      parameters: {
        issue_key: { type: 'string', required: true, description: 'Issue key.' },
        transition_id: {
          type: 'string',
          required: true,
          description: 'Transition ID from jira_list_transitions.',
        },
      },
    },
  ],
};

export default jiraStrings;
