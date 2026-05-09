import {
  clampInteger,
  formatDate,
  formatList,
  requireConnectorCredentials,
  requireText
} from '../../../Core/ConnectorHttp.js';

const NETLIFY_API = 'https://api.netlify.com/api/v1';

async function netlifyRequest(rootDirectory, path, { searchParams = {} } = {}) {
  const credentials = await requireConnectorCredentials(rootDirectory, 'netlify', ['token'], 'Netlify');
  const url = new URL(`${NETLIFY_API}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.token}`
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${data?.message ?? 'Netlify request failed'}`);
  return data;
}

function formatSite(site, index = null) {
  return [
    `${index == null ? '' : `${index + 1}. `}${site.name}`,
    `ID: ${site.id}`,
    `URL: ${site.ssl_url || site.url}`,
    `Repo: ${site.build_settings?.repo_url ?? '(none)'}`,
    `Updated: ${formatDate(site.updated_at)}`
  ].join('\n');
}

export function createNetlifyToolHandlers({ rootDirectory }) {
  return {
    async netlify_get_account() {
      const user = await netlifyRequest(rootDirectory, '/user');
      return [`Netlify user: ${user.full_name || user.email}`, `Email: ${user.email}`, `ID: ${user.id}`].join('\n');
    },

    async netlify_list_sites(params = {}) {
      const limit = clampInteger(params.limit, 20, 1, 50);
      const sites = await netlifyRequest(rootDirectory, '/sites', {
        searchParams: { per_page: limit }
      });
      return formatList('Netlify sites', sites.map(formatSite));
    },

    async netlify_get_site(params = {}) {
      const siteId = encodeURIComponent(requireText(params.site_id ?? params.siteId, 'site_id'));
      return formatSite(await netlifyRequest(rootDirectory, `/sites/${siteId}`));
    },

    async netlify_list_deploys(params = {}) {
      const siteId = encodeURIComponent(requireText(params.site_id ?? params.siteId, 'site_id'));
      const limit = clampInteger(params.limit, 10, 1, 50);
      const deploys = await netlifyRequest(rootDirectory, `/sites/${siteId}/deploys`, {
        searchParams: { per_page: limit }
      });
      return formatList('Netlify deploys', deploys.map((deploy, index) => `${index + 1}. ${deploy.id}\n   State: ${deploy.state} | Branch: ${deploy.branch ?? 'unknown'} | Created: ${formatDate(deploy.created_at)}\n   ${deploy.deploy_ssl_url || deploy.deploy_url || deploy.admin_url}`));
    },

    async netlify_get_deploy(params = {}) {
      const deployId = encodeURIComponent(requireText(params.deploy_id ?? params.deployId, 'deploy_id'));
      const deploy = await netlifyRequest(rootDirectory, `/deploys/${deployId}`);
      return [
        `Netlify deploy: ${deploy.id}`,
        `Site: ${deploy.name ?? deploy.site_id}`,
        `State: ${deploy.state}`,
        `Branch: ${deploy.branch ?? 'unknown'}`,
        `Commit: ${deploy.commit_ref ?? 'unknown'}`,
        `Created: ${formatDate(deploy.created_at)}`,
        `URL: ${deploy.deploy_ssl_url || deploy.deploy_url || deploy.admin_url}`
      ].join('\n');
    }
  };
}
