import {
  buildUrl,
  clampInteger,
  formatDate,
  formatList,
  parseResponseJson,
  requireConnectorCredentials,
  requireText,
} from '../../../Core/ConnectorHttp.js';

const SENTRY_API = 'https://sentry.io/api/0';

async function sentryRequest(
  rootDirectory,
  path,
  { method = 'GET', body, searchParams = {} } = {},
) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'sentry',
    ['token'],
    'Sentry',
  );
  const response = await fetch(buildUrl(SENTRY_API, path, searchParams), {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${credentials.token}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const { data, text } = await parseResponseJson(response);
  if (!response.ok)
    throw new Error(
      `${response.status} ${response.statusText}: ${data?.detail ?? data?.message ?? text}`,
    );
  return data;
}

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
  return {
    async sentry_get_user() {
      const user = await sentryRequest(rootDirectory, '/users/me/');
      return [
        `Sentry user: ${user.name || user.email}`,
        `Email: ${user.email}`,
        `ID: ${user.id}`,
      ].join('\n');
    },

    async sentry_list_organizations() {
      const orgs = await sentryRequest(rootDirectory, '/organizations/');
      return formatList(
        'Sentry organizations',
        orgs.map((org, index) => `${index + 1}. ${org.name}\n   Slug: ${org.slug} | ID: ${org.id}`),
      );
    },

    async sentry_list_projects(params = {}) {
      const orgSlug = encodeURIComponent(
        requireText(params.org_slug ?? params.orgSlug, 'org_slug'),
      );
      const projects = await sentryRequest(rootDirectory, `/organizations/${orgSlug}/projects/`);
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
      const issues = await sentryRequest(rootDirectory, `/organizations/${orgSlug}/issues/`, {
        searchParams: { project: params.project, query: params.query, limit },
      });
      return formatList('Sentry issues', issues.map(formatIssue));
    },

    async sentry_get_issue(params = {}) {
      return formatIssue(
        await sentryRequest(
          rootDirectory,
          `/issues/${encodeURIComponent(requireText(params.issue_id ?? params.issueId, 'issue_id'))}/`,
        ),
      );
    },

    async sentry_resolve_issue(params = {}) {
      const issueId = encodeURIComponent(
        requireText(params.issue_id ?? params.issueId, 'issue_id'),
      );
      const issue = await sentryRequest(rootDirectory, `/issues/${issueId}/`, {
        method: 'PUT',
        body: { status: 'resolved' },
      });
      return [`Sentry issue resolved`, formatIssue(issue)].join('\n\n');
    },
  };
}
