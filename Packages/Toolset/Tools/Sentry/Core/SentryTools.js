import {
  clampInteger,
  formatDate,
  formatList,
  makeConnectorRequest,
  requireText,
} from '../../../Core/ConnectorHttp.js';

const SENTRY_API = 'https://sentry.io/api/0';

function formatIssue(issue, index = null) {
  return [
    `${index == null ? '' : `${index + 1}. `}${issue.title || issue.shortId || issue.id}`,
    `ID: ${issue.id} | Short ID: ${issue.shortId ?? '(none)'}`,
    `Status: ${issue.status} | Level: ${issue.level ?? 'unknown'} | Count: ${issue.count ?? 0}`,
    `Last seen: ${formatDate(issue.lastSeen)}`,
    `Permalink: ${issue.permalink ?? ''}`,
  ].join('\n');
}

export function createSentryToolHandlers({ rootDirectory }) {
  const request = makeConnectorRequest(rootDirectory, {
    connectorId: 'sentry',
    keys: ['token'],
    label: 'Sentry',
    baseUrl: SENTRY_API,
  });

  return {
    async sentry_get_user() {
      const user = await request('/users/me/');
      return [
        `Sentry user: ${user.name || user.email}`,
        `Email: ${user.email}`,
        `ID: ${user.id}`,
      ].join('\n');
    },

    async sentry_list_organizations() {
      const orgs = await request('/organizations/');
      return formatList(
        'Sentry organizations',
        orgs.map((org, index) => `${index + 1}. ${org.name}\n   Slug: ${org.slug} | ID: ${org.id}`),
      );
    },

    async sentry_list_projects(params = {}) {
      const orgSlug = encodeURIComponent(
        requireText(params.org_slug ?? params.orgSlug, 'org_slug'),
      );
      const projects = await request(`/organizations/${orgSlug}/projects/`);
      return formatList(
        'Sentry projects',
        projects.map(
          (project, index) =>
            `${index + 1}. ${project.name}\n   Slug: ${project.slug} | ID: ${project.id} | Platform: ${project.platform ?? 'unknown'}`,
        ),
      );
    },

    async sentry_list_issues(params = {}) {
      const orgSlug = encodeURIComponent(
        requireText(params.org_slug ?? params.orgSlug, 'org_slug'),
      );
      const limit = clampInteger(params.limit, 10, 1, 50);
      const issues = await request(`/organizations/${orgSlug}/issues/`, {
        searchParams: { project: params.project, query: params.query, limit },
      });
      return formatList('Sentry issues', issues.map(formatIssue));
    },

    async sentry_get_issue(params = {}) {
      return formatIssue(
        await request(
          `/issues/${encodeURIComponent(requireText(params.issue_id ?? params.issueId, 'issue_id'))}/`,
        ),
      );
    },

    async sentry_resolve_issue(params = {}) {
      const issueId = encodeURIComponent(
        requireText(params.issue_id ?? params.issueId, 'issue_id'),
      );
      const issue = await request(`/issues/${issueId}/`, {
        method: 'PUT',
        body: { status: 'resolved' },
      });
      return [`Sentry issue resolved`, formatIssue(issue)].join('\n\n');
    },
  };
}
