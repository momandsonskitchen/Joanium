const supabaseStrings = {
  connector: {
    id: 'supabase',
    label: 'Supabase',
    description: 'Projects, organizations, auth config, API settings, and functions through the Supabase Management API.',
    credentialLabel: 'Access token',
    credentialPlaceholder: 'sbp_...',
    credentialKey: 'token',
    optional: false
  },
  tools: [
    {
      name: 'supabase_list_projects',
      description: 'List Supabase projects.',
      category: 'supabase',
      parameters: {}
    },
    {
      name: 'supabase_get_project',
      description: 'Get Supabase project metadata.',
      category: 'supabase',
      parameters: {
        project_ref: { type: 'string', required: true, description: 'Supabase project reference.' }
      }
    },
    {
      name: 'supabase_list_organizations',
      description: 'List Supabase organizations.',
      category: 'supabase',
      parameters: {}
    },
    {
      name: 'supabase_get_auth_config',
      description: 'Get Supabase project auth configuration.',
      category: 'supabase',
      parameters: {
        project_ref: { type: 'string', required: true, description: 'Supabase project reference.' }
      }
    },
    {
      name: 'supabase_get_api_settings',
      description: 'Get Supabase project API settings.',
      category: 'supabase',
      parameters: {
        project_ref: { type: 'string', required: true, description: 'Supabase project reference.' }
      }
    }
  ]
};

export default supabaseStrings;
