import { makeConnectorRequest, requireText, truncateText } from '../../../Core/ConnectorHttp.js';

const SUPABASE_API = 'https://api.supabase.com/v1';

function formatProject(project, index = null) {
  return [
    `${index == null ? '' : `${index + 1}. `}${project.name}`,
    `Reference: ${project.id ?? project.ref}`,
    `Region: ${project.region ?? 'unknown'}`,
    `Organization: ${project.organization_id ?? 'unknown'}`,
    `Status: ${project.status ?? 'unknown'}`,
  ].join('\n');
}

export function createSupabaseToolHandlers({ rootDirectory }) {
  const request = makeConnectorRequest(rootDirectory, {
    connectorId: 'supabase',
    keys: ['token'],
    label: 'Supabase',
    baseUrl: SUPABASE_API,
  });

  return {
    async supabase_list_projects() {
      const projects = await request('/projects');
      return projects.length
        ? ['Supabase projects', '', ...projects.map(formatProject)].join('\n')
        : 'No Supabase projects found.';
    },

    async supabase_get_project(params = {}) {
      const projectRef = encodeURIComponent(
        requireText(params.project_ref ?? params.projectRef, 'project_ref'),
      );
      return formatProject(await request(`/projects/${projectRef}`));
    },

    async supabase_list_organizations() {
      const organizations = await request('/organizations');
      return organizations.length
        ? [
            'Supabase organizations',
            '',
            ...organizations.map((org, index) => `${index + 1}. ${org.name}\n   ID: ${org.id}`),
          ].join('\n')
        : 'No Supabase organizations found.';
    },

    async supabase_get_auth_config(params = {}) {
      const projectRef = encodeURIComponent(
        requireText(params.project_ref ?? params.projectRef, 'project_ref'),
      );
      const config = await request(`/projects/${projectRef}/config/auth`);
      return ['Supabase auth config', '', truncateText(JSON.stringify(config, null, 2), 5000)].join(
        '\n',
      );
    },

    async supabase_get_api_settings(params = {}) {
      const projectRef = encodeURIComponent(
        requireText(params.project_ref ?? params.projectRef, 'project_ref'),
      );
      const settings = await request(`/projects/${projectRef}/api-keys`);
      return [
        'Supabase API settings',
        '',
        truncateText(JSON.stringify(settings, null, 2), 5000),
      ].join('\n');
    },
  };
}
