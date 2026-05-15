import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
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

export function createModelPickerPanel({ providers, userProviderDetails, strings, onSelect }) {
  const panel = createElement('div', 'chat-model-picker');
  document.body.append(panel);

  const scroller = createElement('div', 'chat-model-picker__scroller');
  panel.append(scroller);

  // key: "providerId/modelId"  value: dot element
  const dotRefs = new Map();

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

      const dot = createElement(
        'span',
        'chat-model-picker__health-dot chat-model-picker__health-dot--unknown',
      );
      dot.setAttribute('aria-label', strings.composer.healthYellow);
      const label = createElement(
        'span',
        'chat-model-picker__option-label',
        model.name ?? model.id,
      );
      option.append(dot, label);
      dotRefs.set(`${provider.id}/${model.id}`, dot);

      option.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(provider, model);
      });
      group.append(option);
    }

    scroller.append(group);
  }

  function healthLabel(status) {
    if (status === 'green') return strings.composer.healthGreen;
    if (status === 'red') return strings.composer.healthRed;
    return strings.composer.healthYellow;
  }

  function setDotStatus(dot, status) {
    dot.className = `chat-model-picker__health-dot chat-model-picker__health-dot--${status}`;
    dot.setAttribute('aria-label', healthLabel(status));
  }

  function applyHealthMap(map) {
    for (const [key, status] of Object.entries(map)) {
      const dot = dotRefs.get(key);
      if (!dot) continue;
      setDotStatus(dot, status);
    }
  }

  // Fetch cached health immediately, then kick off background probes for
  // any model whose status is still unknown / stale.
  invokeIpc('chat:health-get')
    .then((healthMap) => {
      applyHealthMap(healthMap);

      // Fire a background probe for every yellow model.
      for (const provider of readyProviders) {
        for (const model of provider.models) {
          const key = `${provider.id}/${model.id}`;
          if ((healthMap[key] ?? 'yellow') === 'yellow') {
            void invokeIpc('chat:health-probe', provider.id, model.id);
          }
        }
      }
    })
    .catch(() => {});

  // Live updates arriving while the picker is open.
  const disposeHealthListener = onIpc('chat:health-update', ({ key, status }) => {
    const dot = dotRefs.get(key);
    if (dot) setDotStatus(dot, status);
  });

  const scrollbar = attachCustomScrollbar(panel, scroller);

  return {
    element: panel,
    dispose() {
      disposeHealthListener();
      scrollbar.dispose();
    },
  };
}
