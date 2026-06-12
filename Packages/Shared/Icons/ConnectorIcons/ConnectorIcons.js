import { getIconPath, iconUrl } from '../Utils.js';

const CONNECTOR_ICON_FILES = Object.freeze({
  // Connectors
  airtable: 'Airtable',
  arxiv: 'ArXiv',
  calendar: 'Calendar',
  cloudflare: 'Cloudflare',
  coingecko: 'CoinGecko',
  contacts: 'Contacts',
  discord: 'Discord',
  docs: 'GoogleDocs',
  drive: 'Drive',
  figma: 'Figma',
  forms: 'Forms',
  github: 'Github',
  gitlab: 'Gitlab',
  gmail: 'Gmail',
  google: 'Google',
  hackernews: 'HackerNews',
  hubspot: 'Hubspot',
  itunes: 'Itunes',
  jira: 'Jira',
  linear: 'Linear',
  mattermost: 'MatterMost',
  nasa: 'Nasa',
  netlify: 'Netlify',
  notion: 'Notion',
  npm: 'Npm',
  ntfy: 'Ntfy',
  open_meteo: 'OpenMeteo',
  openweather: 'OpenWeatherMap',
  perplexity: 'Perplexity',
  photos: 'Photos',
  reddit: 'Reddit',
  sentry: 'Sentry',
  sheets: 'GoogleSheets',
  slack: 'Slack',
  slides: 'Slides',
  spotify: 'Spotify',
  stackoverflow: 'StackOverflow',
  stripe: 'Stripe',
  supabase: 'Supabase',
  tasks: 'GoogleTasks',
  telegram: 'Telegram',
  todoist: 'Tasks',
  unsplash: 'Unsplash',
  vercel: 'Vercel',
  weather: 'OpenWeatherMap',
  whatsapp: 'WhatsApp',
  wikimedia: 'Wikipedia',
  wikipedia: 'Wikipedia',
  youtube: 'Youtube',
  zulip: 'Zulip',
});

const CONNECTOR_PREFIXES = Object.keys(CONNECTOR_ICON_FILES).sort(
  (left, right) => right.length - left.length,
);

export function getConnectorIconPath(connectorId) {
  return getIconPath(connectorId, CONNECTOR_ICON_FILES);
}

export function getConnectorIconPathForToolName(toolName) {
  const lowerName = String(toolName ?? '').toLowerCase();
  if (!lowerName) return null;

  for (const prefix of CONNECTOR_PREFIXES) {
    if (lowerName === prefix || lowerName.startsWith(`${prefix}_`)) {
      return iconUrl(CONNECTOR_ICON_FILES[prefix]);
    }
  }

  return null;
}
