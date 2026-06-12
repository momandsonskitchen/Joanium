import { collapseWhitespace } from '../Utils/StringUtils.js';

export function orderProvidersBySelection(user, providers) {
  const selectedProviderIds = Array.isArray(user?.providers?.selected)
    ? user.providers.selected
    : [];
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const ordered = [];
  const seen = new Set();

  for (const providerId of selectedProviderIds) {
    const provider = providersById.get(providerId);
    if (provider && !seen.has(provider.id)) {
      ordered.push(provider);
      seen.add(provider.id);
    }
  }

  for (const provider of providers) {
    if (!seen.has(provider.id)) {
      ordered.push(provider);
      seen.add(provider.id);
    }
  }

  return ordered;
}

export function providerIsConfigured(provider, details = {}) {
  const endpoint = collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint);
  if (!endpoint) return false;
  if (provider.requiresApiKey && !collapseWhitespace(details.apiKey)) return false;
  return Boolean(provider.models?.[0]?.id);
}
