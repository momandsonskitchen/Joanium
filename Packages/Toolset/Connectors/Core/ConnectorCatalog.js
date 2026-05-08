export const CONNECTOR_CATALOG = Object.freeze([
  {
    id: 'github',
    label: 'GitHub',
    description: 'Repository, issue, pull request, and user lookup through the GitHub API.',
    credentialLabel: 'Personal access token',
    credentialPlaceholder: 'github_pat_...',
    credentialKey: 'token',
    optional: true
  },
  {
    id: 'openweather',
    label: 'OpenWeather',
    description: 'Current weather lookup through OpenWeather.',
    credentialLabel: 'API key',
    credentialPlaceholder: 'OpenWeather API key',
    credentialKey: 'apiKey',
    optional: false
  }
]);

export function getConnectorDefinition(connectorId) {
  return CONNECTOR_CATALOG.find((connector) => connector.id === connectorId) ?? null;
}
