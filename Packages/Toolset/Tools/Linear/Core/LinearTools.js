import {
  clampInteger,
  formatDate,
  formatList,
  requireConnectorCredentials,
  requireText,
} from '../../../Core/ConnectorHttp.js';

const LINEAR_API = 'https://api.linear.app/graphql';

async function linearGraphql(rootDirectory, query, variables = {}) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'linear',
    ['token'],
    'Linear',
  );
  const response = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: credentials.token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.errors?.length) {
    throw new Error(data?.errors?.[0]?.message ?? `${response.status} ${response.statusText}`);
  }
  return data.data;
}

function issueFields() {
  return 'id identifier title url priority createdAt updatedAt assignee { name email } state { name type } team { key name }';
}

function formatIssue(issue, index = null) {
  return [
    `${index == null ? '' : `${index + 1}. `}${issue.identifier}: ${issue.title}`,
    `State: ${issue.state?.name ?? 'unknown'} | Priority: ${issue.priority ?? 0}`,
    `Team: ${issue.team?.key ?? '?'} | Assignee: ${issue.assignee?.name ?? 'Unassigned'}`,
    `Updated: ${formatDate(issue.updatedAt)}`,
    `URL: ${issue.url}`,
  ].join('\n');
}

export function createLinearToolHandlers({ rootDirectory }) {
  return {
    async linear_get_viewer() {
      const data = await linearGraphql(
        rootDirectory,
        'query { viewer { id name email displayName url } }',
      );
      const viewer = data.viewer;
      return [
        `Linear user: ${viewer.name || viewer.displayName}`,
        `Email: ${viewer.email || '(none)'}`,
        `URL: ${viewer.url || ''}`,
      ].join('\n');
    },

    async linear_list_teams(params = {}) {
      const limit = clampInteger(params.limit, 25, 1, 50);
      const data = await linearGraphql(
        rootDirectory,
        'query($first:Int!){ teams(first:$first){ nodes { id key name description issueCount private } } }',
        { first: limit },
      );
      return formatList(
        'Linear teams',
        data.teams.nodes.map(
          (team, index) =>
            `${index + 1}. ${team.key} - ${team.name}\n   ID: ${team.id} | Issues: ${team.issueCount ?? 0}${team.private ? ' | private' : ''}`,
        ),
      );
    },

    async linear_list_my_issues(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 25);
      const state = String(params.state ?? '').trim();
      const query = `query($first:Int!){ viewer { assignedIssues(first:$first, orderBy: updatedAt) { nodes { ${issueFields()} } } } }`;
      const data = await linearGraphql(rootDirectory, query, { first: limit });
      let issues = data.viewer.assignedIssues.nodes ?? [];
      if (state)
        issues = issues.filter((issue) => issue.state?.name?.toLowerCase() === state.toLowerCase());
      return formatList('My Linear issues', issues.map(formatIssue));
    },

    async linear_search_issues(params = {}) {
      const queryText = requireText(params.query, 'query');
      const limit = clampInteger(params.limit, 10, 1, 25);
      const query = `query($term:String!, $first:Int!){ issueSearch(term:$term, first:$first){ nodes { ${issueFields()} } } }`;
      const data = await linearGraphql(rootDirectory, query, { term: queryText, first: limit });
      return formatList(
        `Linear issue search: ${queryText}`,
        (data.issueSearch.nodes ?? []).map(formatIssue),
      );
    },

    async linear_get_issue(params = {}) {
      const issueId = requireText(params.issue_id ?? params.issueId, 'issue_id');
      const query = `query($id:String!){ issue(id:$id){ ${issueFields()} description } }`;
      const data = await linearGraphql(rootDirectory, query, { id: issueId });
      if (!data.issue) throw new Error(`Issue not found: ${issueId}`);
      return [formatIssue(data.issue), '', data.issue.description || '(no description)'].join('\n');
    },

    async linear_create_issue(params = {}) {
      const teamId = requireText(params.team_id ?? params.teamId, 'team_id');
      const title = requireText(params.title, 'title');
      const priority = Number(params.priority ?? 0);
      const query = `mutation($input: IssueCreateInput!){ issueCreate(input:$input){ success issue { ${issueFields()} } } }`;
      const data = await linearGraphql(rootDirectory, query, {
        input: {
          teamId,
          title,
          description: String(params.description ?? ''),
          ...(Number.isFinite(priority) ? { priority } : {}),
        },
      });
      return data.issueCreate?.success
        ? [`Linear issue created`, formatIssue(data.issueCreate.issue)].join('\n\n')
        : 'Linear issue creation did not complete.';
    },

    async linear_add_comment(params = {}) {
      const issueId = requireText(params.issue_id ?? params.issueId, 'issue_id');
      const body = requireText(params.body, 'body');
      const data = await linearGraphql(
        rootDirectory,
        'mutation($input: CommentCreateInput!){ commentCreate(input:$input){ success comment { id url createdAt } } }',
        {
          input: { issueId, body },
        },
      );
      return data.commentCreate?.success
        ? [`Linear comment created`, `URL: ${data.commentCreate.comment.url || ''}`].join('\n')
        : 'Linear comment creation did not complete.';
    },
  };
}
