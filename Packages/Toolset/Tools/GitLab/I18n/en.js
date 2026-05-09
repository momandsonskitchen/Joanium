const gitLabStrings = {
  connector: {
    id: 'gitlab',
    label: 'GitLab',
    description: 'Projects, issues, merge requests, files, and commits through the GitLab API.',
    credentialKey: 'token',
    optional: false,
    fields: [
      {
        key: 'token',
        label: 'Personal access token',
        placeholder: 'glpat-...',
        type: 'password',
        required: true
      },
      {
        key: 'baseUrl',
        label: 'GitLab base URL',
        placeholder: 'https://gitlab.com',
        type: 'text',
        required: false
      }
    ]
  },
  tools: [
    {
      name: 'gitlab_get_current_user',
      description: 'Get the authenticated GitLab user.',
      category: 'gitlab',
      parameters: {}
    },
    {
      name: 'gitlab_list_projects',
      description: 'List projects visible to the configured GitLab token.',
      category: 'gitlab',
      parameters: {
        query: { type: 'string', required: false, description: 'Optional project search query.' },
        limit: { type: 'number', required: false, description: 'Maximum projects, default 20, max 50.' }
      }
    },
    {
      name: 'gitlab_get_project',
      description: 'Get GitLab project metadata by numeric ID or full path.',
      category: 'gitlab',
      parameters: {
        project: { type: 'string', required: true, description: 'Project ID or full path such as group/repo.' }
      }
    },
    {
      name: 'gitlab_list_issues',
      description: 'List GitLab issues for a project.',
      category: 'gitlab',
      parameters: {
        project: { type: 'string', required: true, description: 'Project ID or full path.' },
        state: { type: 'string', required: false, description: 'opened, closed, or all. Defaults to opened.' },
        limit: { type: 'number', required: false, description: 'Maximum issues, default 10, max 50.' }
      }
    },
    {
      name: 'gitlab_list_merge_requests',
      description: 'List GitLab merge requests for a project.',
      category: 'gitlab',
      parameters: {
        project: { type: 'string', required: true, description: 'Project ID or full path.' },
        state: { type: 'string', required: false, description: 'opened, closed, merged, or all. Defaults to opened.' },
        limit: { type: 'number', required: false, description: 'Maximum merge requests, default 10, max 50.' }
      }
    },
    {
      name: 'gitlab_get_file',
      description: 'Read a file from a GitLab project repository.',
      category: 'gitlab',
      parameters: {
        project: { type: 'string', required: true, description: 'Project ID or full path.' },
        file_path: { type: 'string', required: true, description: 'Path inside the repository.' },
        ref: { type: 'string', required: false, description: 'Branch, tag, or commit SHA. Defaults to main.' }
      }
    },
    {
      name: 'gitlab_list_commits',
      description: 'List recent commits for a GitLab project.',
      category: 'gitlab',
      parameters: {
        project: { type: 'string', required: true, description: 'Project ID or full path.' },
        ref: { type: 'string', required: false, description: 'Optional branch or tag.' },
        limit: { type: 'number', required: false, description: 'Maximum commits, default 10, max 50.' }
      }
    },
    {
      name: 'gitlab_create_issue',
      description: 'Create an issue in a GitLab project.',
      category: 'gitlab',
      parameters: {
        project: { type: 'string', required: true, description: 'Project ID or full path.' },
        title: { type: 'string', required: true, description: 'Issue title.' },
        description: { type: 'string', required: false, description: 'Issue description in Markdown.' },
        labels: { type: 'string', required: false, description: 'Comma-separated labels.' }
      }
    }
  ]
};

export default gitLabStrings;
