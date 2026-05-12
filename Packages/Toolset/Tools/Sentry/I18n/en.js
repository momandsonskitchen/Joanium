const sentryStrings = {
  connector: {
    id: 'sentry',
    label: 'Sentry',
    description:
      'Organizations, projects, issues, releases, and event monitoring through the Sentry API.',
    credentialLabel: 'Auth token',
    credentialPlaceholder: 'sntrys_...',
    credentialKey: 'token',
    optional: false,
  },
  tools: [
    {
      name: 'sentry_get_user',
      description: 'Get the authenticated Sentry user.',
      category: 'sentry',
      parameters: {},
    },
    {
      name: 'sentry_list_organizations',
      description: 'List Sentry organizations.',
      category: 'sentry',
      parameters: {},
    },
    {
      name: 'sentry_list_projects',
      description: 'List Sentry projects in an organization.',
      category: 'sentry',
      parameters: {
        org_slug: { type: 'string', required: true, description: 'Sentry organization slug.' },
      },
    },
    {
      name: 'sentry_list_issues',
      description: 'List Sentry issues in an organization.',
      category: 'sentry',
      parameters: {
        org_slug: { type: 'string', required: true, description: 'Sentry organization slug.' },
        project: { type: 'string', required: false, description: 'Optional numeric project ID.' },
        query: { type: 'string', required: false, description: 'Optional Sentry issue query.' },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum issues, default 10, max 50.',
        },
      },
    },
    {
      name: 'sentry_get_issue',
      description: 'Get Sentry issue details.',
      category: 'sentry',
      parameters: {
        issue_id: { type: 'string', required: true, description: 'Sentry issue ID.' },
      },
    },
    {
      name: 'sentry_resolve_issue',
      description: 'Resolve a Sentry issue.',
      category: 'sentry',
      parameters: {
        issue_id: { type: 'string', required: true, description: 'Sentry issue ID.' },
      },
    },
  ],
};

export default sentryStrings;
