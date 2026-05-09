import {
  clampInteger,
  formatDate,
  formatList,
  requireConnectorCredentials,
  requireText
} from '../../../Core/ConnectorHttp.js';

const HUBSPOT_API = 'https://api.hubapi.com';

async function hubSpotRequest(rootDirectory, path, { method = 'GET', body, searchParams = {} } = {}) {
  const credentials = await requireConnectorCredentials(rootDirectory, 'hubspot', ['token'], 'HubSpot');
  const url = new URL(`${HUBSPOT_API}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${credentials.token}`
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${data?.message ?? 'HubSpot request failed'}`);
  return data;
}

function formatContact(contact, index = null) {
  const props = contact.properties ?? {};
  return [
    `${index == null ? '' : `${index + 1}. `}${[props.firstname, props.lastname].filter(Boolean).join(' ') || props.email || contact.id}`,
    `Email: ${props.email ?? '(none)'}`,
    `Company: ${props.company ?? '(none)'}`,
    `ID: ${contact.id} | Updated: ${formatDate(contact.updatedAt)}`
  ].join('\n');
}

export function createHubSpotToolHandlers({ rootDirectory }) {
  return {
    async hubspot_list_contacts(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await hubSpotRequest(rootDirectory, '/crm/v3/objects/contacts', {
        searchParams: { limit, properties: 'email,firstname,lastname,company' }
      });
      return formatList('HubSpot contacts', (data.results ?? []).map(formatContact));
    },

    async hubspot_search_contacts(params = {}) {
      const query = requireText(params.query, 'query');
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await hubSpotRequest(rootDirectory, '/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: {
          query,
          limit,
          properties: ['email', 'firstname', 'lastname', 'company']
        }
      });
      return formatList(`HubSpot contact search: ${query}`, (data.results ?? []).map(formatContact));
    },

    async hubspot_get_contact(params = {}) {
      const contactId = encodeURIComponent(requireText(params.contact_id ?? params.contactId, 'contact_id'));
      return formatContact(await hubSpotRequest(rootDirectory, `/crm/v3/objects/contacts/${contactId}`, {
        searchParams: { properties: 'email,firstname,lastname,company,phone,website' }
      }));
    },

    async hubspot_create_contact(params = {}) {
      const email = requireText(params.email, 'email');
      const contact = await hubSpotRequest(rootDirectory, '/crm/v3/objects/contacts', {
        method: 'POST',
        body: {
          properties: {
            email,
            firstname: String(params.firstname ?? ''),
            lastname: String(params.lastname ?? ''),
            company: String(params.company ?? '')
          }
        }
      });
      return [`HubSpot contact created`, formatContact(contact)].join('\n\n');
    },

    async hubspot_list_companies(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await hubSpotRequest(rootDirectory, '/crm/v3/objects/companies', {
        searchParams: { limit, properties: 'name,domain,industry,city,country' }
      });
      return formatList('HubSpot companies', (data.results ?? []).map((company, index) => `${index + 1}. ${company.properties?.name || company.id}\n   Domain: ${company.properties?.domain ?? '(none)'} | Industry: ${company.properties?.industry ?? '(none)'}\n   ID: ${company.id}`));
    },

    async hubspot_list_deals(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await hubSpotRequest(rootDirectory, '/crm/v3/objects/deals', {
        searchParams: { limit, properties: 'dealname,amount,dealstage,pipeline,closedate' }
      });
      return formatList('HubSpot deals', (data.results ?? []).map((deal, index) => `${index + 1}. ${deal.properties?.dealname || deal.id}\n   Amount: ${deal.properties?.amount ?? '(unknown)'} | Stage: ${deal.properties?.dealstage ?? '(unknown)'}\n   Close date: ${deal.properties?.closedate ?? '(none)'}`));
    }
  };
}
