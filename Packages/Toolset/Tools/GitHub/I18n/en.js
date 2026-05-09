const githubStrings = {
  connector: {
    id: 'github',
    label: 'GitHub',
    description: 'Repository, issue, pull request, workflow, and user lookup through the GitHub API.',
    credentialLabel: 'Personal access token',
    credentialPlaceholder: 'github_pat_...',
    credentialKey: 'token',
    optional: true
  },
  tools: [
    {
      name: 'github_get_repository',
      description: 'Fetch GitHub repository metadata. Uses the GitHub connector token when configured.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' }
      }
    },
    {
      name: 'github_get_user',
      description: 'Fetch a GitHub user or organization profile.',
      category: 'github',
      parameters: {
        username: { type: 'string', required: true, description: 'GitHub username or organization login.' }
      }
    },
    {
      name: 'github_list_repos',
      description: 'List repositories visible to the configured GitHub token.',
      category: 'github',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum repositories, default 20, max 50.' }
      }
    },
    {
      name: 'github_list_issues',
      description: 'List recent GitHub issues or pull requests for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        state: { type: 'string', required: false, description: 'open, closed, or all. Defaults to open.' },
        limit: { type: 'number', required: false, description: 'Maximum results, default 10, max 30.' }
      }
    },
    {
      name: 'github_get_issues',
      description: 'List issues for a repository, excluding pull requests.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        state: { type: 'string', required: false, description: 'open, closed, or all. Defaults to open.' },
        limit: { type: 'number', required: false, description: 'Maximum results, default 10, max 30.' }
      }
    },
    {
      name: 'github_get_pull_requests',
      description: 'List pull requests for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        state: { type: 'string', required: false, description: 'open, closed, or all. Defaults to open.' },
        limit: { type: 'number', required: false, description: 'Maximum results, default 10, max 30.' }
      }
    },
    {
      name: 'github_get_file',
      description: 'Load a file from a GitHub repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        filePath: { type: 'string', required: true, description: 'Path inside the repository.' },
        ref: { type: 'string', required: false, description: 'Optional branch, tag, or commit SHA.' }
      }
    },
    {
      name: 'github_get_file_tree',
      description: 'Get the recursive file tree for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        ref: { type: 'string', required: false, description: 'Optional branch, tag, or commit SHA.' },
        limit: { type: 'number', required: false, description: 'Maximum paths to show, default 100, max 300.' }
      }
    },
    {
      name: 'github_get_commits',
      description: 'List recent commits for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        branch: { type: 'string', required: false, description: 'Optional branch or SHA.' },
        limit: { type: 'number', required: false, description: 'Maximum commits, default 10, max 30.' }
      }
    },
    {
      name: 'github_list_branches',
      description: 'List branches in a GitHub repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        limit: { type: 'number', required: false, description: 'Maximum branches, default 30, max 100.' }
      }
    },
    {
      name: 'github_get_releases',
      description: 'List recent releases for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        limit: { type: 'number', required: false, description: 'Maximum releases, default 5, max 20.' }
      }
    },
    {
      name: 'github_get_latest_release',
      description: 'Get the latest published release for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' }
      }
    },
    {
      name: 'github_get_contributors',
      description: 'List contributors to a GitHub repository sorted by commit count.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        limit: { type: 'number', required: false, description: 'Maximum contributors, default 20, max 50.' }
      }
    },
    {
      name: 'github_get_languages',
      description: 'Get repository programming language byte counts.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' }
      }
    },
    {
      name: 'github_get_topics',
      description: 'Get topic tags applied to a GitHub repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' }
      }
    },
    {
      name: 'github_get_readme',
      description: 'Fetch the README for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        ref: { type: 'string', required: false, description: 'Optional branch, tag, or commit SHA.' }
      }
    },
    {
      name: 'github_search_code',
      description: 'Search code in a GitHub repository. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        query: { type: 'string', required: true, description: 'Code search query.' },
        limit: { type: 'number', required: false, description: 'Maximum results, default 10, max 30.' }
      }
    },
    {
      name: 'github_get_pr_details',
      description: 'Get detailed pull request metadata.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        pr_number: { type: 'number', required: true, description: 'Pull request number.' }
      }
    },
    {
      name: 'github_get_pr_diff',
      description: 'Get a pull request unified diff.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        pr_number: { type: 'number', required: true, description: 'Pull request number.' }
      }
    },
    {
      name: 'github_get_pr_checks',
      description: 'Get commit status and check runs for a pull request.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        pr_number: { type: 'number', required: true, description: 'Pull request number.' }
      }
    },
    {
      name: 'github_get_workflow_runs',
      description: 'List recent GitHub Actions workflow runs for a repository.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        branch: { type: 'string', required: false, description: 'Optional branch filter.' },
        event: { type: 'string', required: false, description: 'Optional GitHub event filter.' },
        limit: { type: 'number', required: false, description: 'Maximum runs, default 10, max 30.' }
      }
    },
    {
      name: 'github_create_issue',
      description: 'Create a GitHub issue. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        title: { type: 'string', required: true, description: 'Issue title.' },
        body: { type: 'string', required: false, description: 'Issue body in Markdown.' },
        labels: { type: 'string', required: false, description: 'Comma-separated label names.' }
      }
    },
    {
      name: 'github_update_issue',
      description: 'Update a GitHub issue title, body, state, labels, or assignees. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        issue_number: { type: 'number', required: true, description: 'Issue number.' },
        title: { type: 'string', required: false, description: 'New title.' },
        body: { type: 'string', required: false, description: 'New body in Markdown.' },
        state: { type: 'string', required: false, description: 'open or closed.' },
        labels: { type: 'string', required: false, description: 'Comma-separated label names to set.' },
        assignees: { type: 'string', required: false, description: 'Comma-separated usernames to set.' }
      }
    },
    {
      name: 'github_close_issue',
      description: 'Close a GitHub issue. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        issue_number: { type: 'number', required: true, description: 'Issue number.' }
      }
    },
    {
      name: 'github_reopen_issue',
      description: 'Reopen a GitHub issue. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        issue_number: { type: 'number', required: true, description: 'Issue number.' }
      }
    },
    {
      name: 'github_comment_on_issue',
      description: 'Comment on a GitHub issue or pull request. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        issue_number: { type: 'number', required: true, description: 'Issue or pull request number.' },
        body: { type: 'string', required: true, description: 'Comment body in Markdown.' }
      }
    },
    {
      name: 'github_create_pull_request',
      description: 'Create a pull request. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        title: { type: 'string', required: true, description: 'Pull request title.' },
        head: { type: 'string', required: true, description: 'Source branch.' },
        base: { type: 'string', required: true, description: 'Target branch.' },
        body: { type: 'string', required: false, description: 'Pull request body in Markdown.' },
        draft: { type: 'boolean', required: false, description: 'Open as a draft pull request.' }
      }
    },
    {
      name: 'github_close_pull_request',
      description: 'Close a pull request without merging. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        pr_number: { type: 'number', required: true, description: 'Pull request number.' }
      }
    },
    {
      name: 'github_add_labels',
      description: 'Add labels to a GitHub issue or pull request. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        issue_number: { type: 'number', required: true, description: 'Issue or pull request number.' },
        labels: { type: 'string', required: true, description: 'Comma-separated label names.' }
      }
    },
    {
      name: 'github_add_assignees',
      description: 'Assign users to a GitHub issue or pull request. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        issue_number: { type: 'number', required: true, description: 'Issue or pull request number.' },
        assignees: { type: 'string', required: true, description: 'Comma-separated GitHub usernames.' }
      }
    },
    {
      name: 'github_trigger_workflow',
      description: 'Trigger a GitHub Actions workflow dispatch. Requires a configured GitHub token.',
      category: 'github',
      parameters: {
        owner: { type: 'string', required: true, description: 'Repository owner or organization.' },
        repo: { type: 'string', required: true, description: 'Repository name.' },
        workflow_id: { type: 'string', required: true, description: 'Workflow file name or numeric ID.' },
        ref: { type: 'string', required: false, description: 'Branch or tag to run. Defaults to main.' },
        inputs: { type: 'string', required: false, description: 'JSON object of workflow inputs.' }
      }
    }
  ]
};

export default githubStrings;
