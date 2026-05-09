const netlifyStrings = {
  connector: {
    id: 'netlify',
    label: 'Netlify',
    description: 'Sites, deploys, forms, functions, and account metadata through the Netlify API.',
    credentialLabel: 'Personal access token',
    credentialPlaceholder: 'Netlify personal access token',
    credentialKey: 'token',
    optional: false
  },
  tools: [
    {
      name: 'netlify_get_account',
      description: 'Get the authenticated Netlify account.',
      category: 'netlify',
      parameters: {}
    },
    {
      name: 'netlify_list_sites',
      description: 'List Netlify sites.',
      category: 'netlify',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum sites, default 20, max 50.' }
      }
    },
    {
      name: 'netlify_get_site',
      description: 'Get Netlify site metadata.',
      category: 'netlify',
      parameters: {
        site_id: { type: 'string', required: true, description: 'Site ID or name.' }
      }
    },
    {
      name: 'netlify_list_deploys',
      description: 'List deploys for a Netlify site.',
      category: 'netlify',
      parameters: {
        site_id: { type: 'string', required: true, description: 'Site ID or name.' },
        limit: { type: 'number', required: false, description: 'Maximum deploys, default 10, max 50.' }
      }
    },
    {
      name: 'netlify_get_deploy',
      description: 'Get a Netlify deploy.',
      category: 'netlify',
      parameters: {
        deploy_id: { type: 'string', required: true, description: 'Deploy ID.' }
      }
    }
  ]
};

export default netlifyStrings;
