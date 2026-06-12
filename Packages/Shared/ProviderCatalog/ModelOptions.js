export function buildAvailableModelOptions(
  providers,
  userProviderDetails,
  { defaultOption = null } = {},
) {
  const options = defaultOption ? [defaultOption] : [];

  for (const provider of providers) {
    if (!provider.models?.length) continue;

    const details = userProviderDetails?.[provider.id] ?? {};
    const endpoint = (details.endpoint ?? '').trim() || (provider.endpoint ?? '').trim();
    if (!endpoint) continue;
    if (provider.requiresApiKey && !(details.apiKey ?? '').trim()) continue;

    for (const model of provider.models) {
      options.push({
        value: `${provider.id}/${model.id}`,
        label: model.name ?? model.id,
        iconPath: provider.iconPath ?? null,
        // Pass through full objects so dropdowns can show model info popovers.
        model,
        provider,
      });
    }
  }

  return options;
}

export function encodeModelValue(model, fallbackValue = '') {
  if (!model?.providerId || !model?.modelId) return fallbackValue;
  return `${model.providerId}/${model.modelId}`;
}

export function decodeModelValue(value, defaultValue = '') {
  if (!value || value === defaultValue) return null;
  const slashIndex = value.indexOf('/');
  if (slashIndex < 0) return null;
  return {
    providerId: value.slice(0, slashIndex),
    modelId: value.slice(slashIndex + 1),
  };
}
