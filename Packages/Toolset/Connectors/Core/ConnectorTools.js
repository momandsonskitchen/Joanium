import { readUserState } from '../../../Shared/UserData/UserData.js';

const GITHUB_API = 'https://api.github.com';
const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Missing required parameter: ${label}.`);
  return text;
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(value);
  }
}

async function readConnectorDetails(rootDirectory, connectorId) {
  const state = await readUserState(rootDirectory);
  return state.connectors?.details?.[connectorId] ?? {};
}

async function readJsonResponse(response) {
  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error?.message || rawText || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return data;
}

async function githubRequest(rootDirectory, pathname, searchParams = {}) {
  const details = await readConnectorDetails(rootDirectory, 'github');
  const token = String(details.token ?? '').trim();
  const url = new URL(`${GITHUB_API}${pathname}`);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'Joanium',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  });

  return readJsonResponse(response);
}

function formatRepository(repository) {
  return [
    `Repository: ${repository.full_name}`,
    `Description: ${repository.description || '(none)'}`,
    `Visibility: ${repository.private ? 'private' : 'public'}`,
    `Default branch: ${repository.default_branch || '(unknown)'}`,
    `Language: ${repository.language || '(unknown)'}`,
    `Stars: ${repository.stargazers_count ?? 0}`,
    `Forks: ${repository.forks_count ?? 0}`,
    `Open issues: ${repository.open_issues_count ?? 0}`,
    `Updated: ${formatDate(repository.updated_at)}`,
    `URL: ${repository.html_url}`
  ].join('\n');
}

function formatGitHubUser(user) {
  return [
    `GitHub user: ${user.login}`,
    `Name: ${user.name || '(none)'}`,
    `Company: ${user.company || '(none)'}`,
    `Location: ${user.location || '(none)'}`,
    `Public repos: ${user.public_repos ?? 0}`,
    `Followers: ${user.followers ?? 0}`,
    `Following: ${user.following ?? 0}`,
    `Created: ${formatDate(user.created_at)}`,
    `URL: ${user.html_url}`
  ].join('\n');
}

function formatIssues(issues, owner, repo) {
  if (!issues.length) {
    return `No matching issues found for ${owner}/${repo}.`;
  }

  return [
    `Issues for ${owner}/${repo}:`,
    '',
    ...issues.map((issue) => [
      `#${issue.number} ${issue.title}`,
      `State: ${issue.state}${issue.pull_request ? ' (pull request)' : ''}`,
      `Author: ${issue.user?.login || '(unknown)'}`,
      `Updated: ${formatDate(issue.updated_at)}`,
      `URL: ${issue.html_url}`
    ].join('\n'))
  ].join('\n\n');
}

async function openWeatherCurrent(rootDirectory, params = {}) {
  const details = await readConnectorDetails(rootDirectory, 'openweather');
  const apiKey = String(details.apiKey ?? '').trim();
  if (!apiKey) {
    throw new Error('OpenWeather API key is not configured in Settings > Connectors.');
  }

  const location = requireText(params.location ?? params.query ?? params.city, 'location');
  const units = ['standard', 'metric', 'imperial'].includes(String(params.units ?? '').toLowerCase())
    ? String(params.units).toLowerCase()
    : 'metric';
  const url = new URL(OPENWEATHER_API);
  url.searchParams.set('q', location);
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', units);

  const data = await readJsonResponse(await fetch(url));
  const temperatureUnit = units === 'imperial' ? 'F' : units === 'standard' ? 'K' : 'C';
  const speedUnit = units === 'imperial' ? 'mph' : 'm/s';
  const weather = data.weather?.[0]?.description || 'unknown';

  return [
    `Weather for ${data.name || location}${data.sys?.country ? `, ${data.sys.country}` : ''}`,
    `Condition: ${weather}`,
    `Temperature: ${Math.round(data.main?.temp ?? 0)} deg ${temperatureUnit}`,
    `Feels like: ${Math.round(data.main?.feels_like ?? 0)} deg ${temperatureUnit}`,
    `Humidity: ${data.main?.humidity ?? '(unknown)'}%`,
    `Wind: ${data.wind?.speed ?? '(unknown)'} ${speedUnit}`,
    `Pressure: ${data.main?.pressure ?? '(unknown)'} hPa`
  ].join('\n');
}

export function createConnectorToolHandlers({ rootDirectory }) {
  return {
    async github_get_repository(params = {}) {
      const owner = requireText(params.owner, 'owner');
      const repo = requireText(params.repo, 'repo');
      return formatRepository(await githubRequest(rootDirectory, `/repos/${owner}/${repo}`));
    },

    async github_get_user(params = {}) {
      const username = requireText(params.username ?? params.user, 'username');
      return formatGitHubUser(await githubRequest(rootDirectory, `/users/${username}`));
    },

    async github_list_issues(params = {}) {
      const owner = requireText(params.owner, 'owner');
      const repo = requireText(params.repo, 'repo');
      const state = ['open', 'closed', 'all'].includes(String(params.state ?? '').toLowerCase())
        ? String(params.state).toLowerCase()
        : 'open';
      const perPage = clampInteger(params.limit ?? params.per_page, 10, 1, 30);
      const issues = await githubRequest(rootDirectory, `/repos/${owner}/${repo}/issues`, {
        state,
        per_page: perPage
      });
      return formatIssues(Array.isArray(issues) ? issues : [], owner, repo);
    },

    openweather_current(params = {}) {
      return openWeatherCurrent(rootDirectory, params);
    }
  };
}
