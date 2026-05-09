import {
  clampInteger,
  formatDate,
  formatList,
  requireConnectorCredentials,
  requireText
} from '../../../Core/ConnectorHttp.js';

const VERCEL_API = 'https://api.vercel.com';

async function vercelRequest(rootDirectory, path, { searchParams = {} } = {}) {
  const credentials = await requireConnectorCredentials(rootDirectory, 'vercel', ['token'], 'Vercel');
  const url = new URL(`${VERCEL_API}${path}`);
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
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${data?.error?.message ?? data?.message ?? 'Vercel request failed'}`);
  return data;
}

export function createVercelToolHandlers({ rootDirectory }) {
  return {
    async vercel_list_projects(params = {}) {
      const limit = clampInteger(params.limit, 20, 1, 50);
      const data = await vercelRequest(rootDirectory, '/v9/projects', {
        searchParams: { teamId: params.team_id ?? params.teamId, limit }
      });
      return formatList('Vercel projects', (data.projects ?? []).map((project, index) => `${index + 1}. ${project.name}\n   ID: ${project.id} | Framework: ${project.framework ?? 'unknown'} | Updated: ${formatDate(project.updatedAt)}`));
    },

    async vercel_get_project(params = {}) {
      const projectId = encodeURIComponent(requireText(params.project_id ?? params.projectId, 'project_id'));
      const project = await vercelRequest(rootDirectory, `/v9/projects/${projectId}`, {
        searchParams: { teamId: params.team_id ?? params.teamId }
      });
      return [
        `Vercel project: ${project.name}`,
        `ID: ${project.id}`,
        `Framework: ${project.framework ?? 'unknown'}`,
        `Node version: ${project.nodeVersion ?? 'default'}`,
        `Root directory: ${project.rootDirectory ?? '(repo root)'}`,
        `Updated: ${formatDate(project.updatedAt)}`
      ].join('\n');
    },

    async vercel_list_deployments(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await vercelRequest(rootDirectory, '/v6/deployments', {
        searchParams: {
          teamId: params.team_id ?? params.teamId,
          projectId: params.project_id ?? params.projectId,
          limit
        }
      });
      return formatList('Vercel deployments', (data.deployments ?? []).map((deployment, index) => `${index + 1}. ${deployment.name || deployment.url}\n   State: ${deployment.state} | Target: ${deployment.target ?? 'unknown'} | Created: ${formatDate(deployment.createdAt)}\n   https://${deployment.url}`));
    },

    async vercel_get_deployment(params = {}) {
      const deploymentId = encodeURIComponent(requireText(params.deployment_id ?? params.deploymentId, 'deployment_id'));
      const deployment = await vercelRequest(rootDirectory, `/v13/deployments/${deploymentId}`, {
        searchParams: { teamId: params.team_id ?? params.teamId }
      });
      return [
        `Vercel deployment: ${deployment.name || deployment.url}`,
        `ID: ${deployment.id ?? deployment.uid}`,
        `State: ${deployment.readyState ?? deployment.state}`,
        `Target: ${deployment.target ?? 'unknown'}`,
        `Created: ${formatDate(deployment.createdAt)}`,
        `URL: https://${deployment.url}`
      ].join('\n');
    },

    async vercel_list_domains(params = {}) {
      const limit = clampInteger(params.limit, 20, 1, 50);
      const data = await vercelRequest(rootDirectory, '/v5/domains', {
        searchParams: { teamId: params.team_id ?? params.teamId, limit }
      });
      return formatList('Vercel domains', (data.domains ?? []).map((domain, index) => `${index + 1}. ${domain.name}\n   Verified: ${domain.verified ?? false} | Created: ${formatDate(domain.createdAt)}`));
    }
  };
}
