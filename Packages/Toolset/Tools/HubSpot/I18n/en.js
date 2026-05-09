const hubSpotStrings = {
  connector: {
    id: 'hubspot',
    label: 'HubSpot',
    description: 'Contacts, companies, deals, tickets, and CRM search through the HubSpot API.',
    credentialLabel: 'Private app token',
    credentialPlaceholder: 'pat-...',
    credentialKey: 'token',
    optional: false
  },
  tools: [
    {
      name: 'hubspot_list_contacts',
      description: 'List HubSpot contacts.',
      category: 'hubspot',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum contacts, default 10, max 50.' }
      }
    },
    {
      name: 'hubspot_search_contacts',
      description: 'Search HubSpot contacts by email/name text.',
      category: 'hubspot',
      parameters: {
        query: { type: 'string', required: true, description: 'Search query.' },
        limit: { type: 'number', required: false, description: 'Maximum contacts, default 10, max 50.' }
      }
    },
    {
      name: 'hubspot_get_contact',
      description: 'Get a HubSpot contact by ID.',
      category: 'hubspot',
      parameters: {
        contact_id: { type: 'string', required: true, description: 'HubSpot contact ID.' }
      }
    },
    {
      name: 'hubspot_create_contact',
      description: 'Create a HubSpot contact.',
      category: 'hubspot',
      parameters: {
        email: { type: 'string', required: true, description: 'Contact email.' },
        firstname: { type: 'string', required: false, description: 'First name.' },
        lastname: { type: 'string', required: false, description: 'Last name.' },
        company: { type: 'string', required: false, description: 'Company name.' }
      }
    },
    {
      name: 'hubspot_list_companies',
      description: 'List HubSpot companies.',
      category: 'hubspot',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum companies, default 10, max 50.' }
      }
    },
    {
      name: 'hubspot_list_deals',
      description: 'List HubSpot deals.',
      category: 'hubspot',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum deals, default 10, max 50.' }
      }
    }
  ]
};

export default hubSpotStrings;
