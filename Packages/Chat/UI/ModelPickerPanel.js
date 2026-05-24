import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';

export function getPreferredProvider(payload) {
  const selectedIds = payload.user?.providers?.selected ?? [];
  const byId = new Map(payload.providers.map((provider) => [provider.id, provider]));
  const ordered = [
    ...selectedIds.map((id) => byId.get(id)).filter(Boolean),
    ...payload.providers.filter((provider) => !selectedIds.includes(provider.id)),
  ];

  return (
    ordered.find((provider) => {
      const details = payload.user?.providers?.details?.[provider.id] ?? {};
      return (
        Boolean(provider.models?.[0]?.id) &&
        Boolean(collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint)) &&
        (provider.requiresApiKey ? Boolean(collapseWhitespace(details.apiKey)) : true)
      );
    }) ??
    ordered.find((provider) => provider.models?.length > 0) ??
    payload.providers[0] ??
    null
  );
}

export function createModelPickerPanel({ providers, userProviderDetails, onSelect }) {
  const panel = createElement('div', 'chat-model-picker');
  document.body.append(panel);

  const scroller = createElement('div', 'chat-model-picker__scroller');
  panel.append(scroller);

  const readyProviders = providers.filter((provider) => {
    if (!provider.models?.length) return false;
    const details = userProviderDetails?.[provider.id] ?? {};
    const endpoint = collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint);
    if (!endpoint) return false;
    if (provider.requiresApiKey && !collapseWhitespace(details.apiKey)) return false;
    return true;
  });

  for (const provider of readyProviders) {
    const group = createElement('div', 'chat-model-picker__group');
    group.append(createElement('div', 'chat-model-picker__group-header', provider.label));

    for (const model of provider.models) {
      const option = createElement('button', 'chat-model-picker__option');
      option.type = 'button';
      option._pickerProviderId = provider.id;
      option._pickerModelId = model.id;

      const label = createElement(
        'span',
        'chat-model-picker__option-label',
        model.name ?? model.id,
      );
      option.append(label);

      option.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(provider, model);
      });
      group.append(option);
    }

    scroller.append(group);
  }

  const scrollbar = attachCustomScrollbar(panel, scroller);

  return {
    element: panel,
    dispose() {
      scrollbar.dispose();
    },
  };
}
