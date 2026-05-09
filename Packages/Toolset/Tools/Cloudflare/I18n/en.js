const cloudflareStrings = {
  connector: {
    id: 'cloudflare',
    label: 'Cloudflare',
    description: 'Zones, accounts, DNS records, cache purge, and user info through the Cloudflare API.',
    credentialLabel: 'API token',
    credentialPlaceholder: 'Cloudflare API token',
    credentialKey: 'token',
    optional: false
  },
  tools: [
    {
      name: 'cloudflare_get_user',
      description: 'Get the authenticated Cloudflare user.',
      category: 'cloudflare',
      parameters: {}
    },
    {
      name: 'cloudflare_list_accounts',
      description: 'List Cloudflare accounts available to the token.',
      category: 'cloudflare',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum accounts, default 20, max 50.' }
      }
    },
    {
      name: 'cloudflare_list_zones',
      description: 'List Cloudflare zones.',
      category: 'cloudflare',
      parameters: {
        name: { type: 'string', required: false, description: 'Optional zone name filter.' },
        limit: { type: 'number', required: false, description: 'Maximum zones, default 20, max 50.' }
      }
    },
    {
      name: 'cloudflare_get_zone',
      description: 'Get Cloudflare zone metadata.',
      category: 'cloudflare',
      parameters: {
        zone_id: { type: 'string', required: true, description: 'Cloudflare zone ID.' }
      }
    },
    {
      name: 'cloudflare_list_dns_records',
      description: 'List DNS records for a Cloudflare zone.',
      category: 'cloudflare',
      parameters: {
        zone_id: { type: 'string', required: true, description: 'Cloudflare zone ID.' },
        name: { type: 'string', required: false, description: 'Optional DNS record name filter.' },
        type: { type: 'string', required: false, description: 'Optional DNS type filter such as A, CNAME, TXT.' },
        limit: { type: 'number', required: false, description: 'Maximum records, default 20, max 100.' }
      }
    },
    {
      name: 'cloudflare_create_dns_record',
      description: 'Create a DNS record in a Cloudflare zone.',
      category: 'cloudflare',
      parameters: {
        zone_id: { type: 'string', required: true, description: 'Cloudflare zone ID.' },
        type: { type: 'string', required: true, description: 'DNS record type.' },
        name: { type: 'string', required: true, description: 'DNS record name.' },
        content: { type: 'string', required: true, description: 'DNS record content.' },
        proxied: { type: 'boolean', required: false, description: 'Proxy through Cloudflare.' },
        ttl: { type: 'number', required: false, description: 'TTL seconds. Defaults to automatic.' }
      }
    },
    {
      name: 'cloudflare_purge_cache',
      description: 'Purge Cloudflare cache for a zone.',
      category: 'cloudflare',
      parameters: {
        zone_id: { type: 'string', required: true, description: 'Cloudflare zone ID.' },
        files: { type: 'string', required: false, description: 'Comma-separated URLs to purge. Empty purges everything.' }
      }
    }
  ]
};

export default cloudflareStrings;
