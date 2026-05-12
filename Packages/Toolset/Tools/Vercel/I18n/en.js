const vercelStrings = {
  connector: {
    id: 'vercel',
    label: 'Vercel',
    description:
      'Projects, deployments, domains, teams, and environment variables through the Vercel API.',
    credentialLabel: 'Personal access token',
    credentialPlaceholder: 'Vercel access token',
    credentialKey: 'token',
    optional: false,
  },
  tools: [
    {
      name: 'vercel_list_projects',
      description: 'List Vercel projects visible to the token.',
      category: 'vercel',
      parameters: {
        team_id: { type: 'string', required: false, description: 'Optional Vercel team ID.' },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum projects, default 20, max 50.',
        },
      },
    },
    {
      name: 'vercel_get_project',
      description: 'Get Vercel project metadata.',
      category: 'vercel',
      parameters: {
        project_id: { type: 'string', required: true, description: 'Project ID or name.' },
        team_id: { type: 'string', required: false, description: 'Optional Vercel team ID.' },
      },
    },
    {
      name: 'vercel_list_deployments',
      description: 'List Vercel deployments.',
      category: 'vercel',
      parameters: {
        project_id: {
          type: 'string',
          required: false,
          description: 'Optional project ID or name.',
        },
        team_id: { type: 'string', required: false, description: 'Optional Vercel team ID.' },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum deployments, default 10, max 50.',
        },
      },
    },
    {
      name: 'vercel_get_deployment',
      description: 'Get Vercel deployment details.',
      category: 'vercel',
      parameters: {
        deployment_id: { type: 'string', required: true, description: 'Deployment ID or URL.' },
        team_id: { type: 'string', required: false, description: 'Optional Vercel team ID.' },
      },
    },
    {
      name: 'vercel_list_domains',
      description: 'List Vercel account/team domains.',
      category: 'vercel',
      parameters: {
        team_id: { type: 'string', required: false, description: 'Optional Vercel team ID.' },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum domains, default 20, max 50.',
        },
      },
    },
  ],
};

export default vercelStrings;
