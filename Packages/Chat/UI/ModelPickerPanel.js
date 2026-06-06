import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';

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

  // ── Search bar (fixed above the scroll area, not inside it) ──────────
  const searchWrap = createElement('div', 'chat-model-picker__search');
  const search = createSearchBar({
    placeholder: 'Search models…',
    onChange: (query) => filterGroups(query),
  });
  searchWrap.append(search.element);
  panel.append(searchWrap);

  const scroller = createElement('div', 'chat-model-picker__scroller');
  panel.append(scroller);

  // ── Provider groups ───────────────────────────────────────────────────
  const readyProviders = providers.filter((provider) => {
    if (!provider.models?.length) return false;
    const details = userProviderDetails?.[provider.id] ?? {};
    const endpoint = collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint);
    if (!endpoint) return false;
    if (provider.requiresApiKey && !collapseWhitespace(details.apiKey)) return false;
    return true;
  });

  const groups = [];

  for (const provider of readyProviders) {
    const group = createElement('div', 'chat-model-picker__group');
    group.append(createElement('div', 'chat-model-picker__group-header', provider.label));

    const modelEntries = [];

    for (const model of provider.models) {
      const option = createElement('button', 'chat-model-picker__option');
      option.type = 'button';
      option._pickerProviderId = provider.id;
      option._pickerModelId = model.id;

      if (provider.iconPath) {
        const providerIcon = document.createElement('img');
        providerIcon.className = 'chat-model-picker__option-provider-icon';
        providerIcon.src = provider.iconPath;
        providerIcon.alt = provider.label ?? '';
        providerIcon.draggable = false;
        option.append(providerIcon);
      }

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
      modelEntries.push({
        option,
        searchText: `${model.name ?? model.id} ${provider.label}`.toLowerCase(),
      });
    }

    scroller.append(group);
    groups.push({ group, modelEntries });
  }

  // ── Empty state ───────────────────────────────────────────────────────
  const emptyEl = createElement('div', 'chat-model-picker__empty', 'No models match');
  emptyEl.hidden = true;
  scroller.append(emptyEl);

  // ── Filter function ───────────────────────────────────────────────────
  function filterGroups(query) {
    const q = query.trim().toLowerCase();
    let anyVisible = false;

    for (const { group, modelEntries } of groups) {
      let groupHasMatch = false;
      for (const { option, searchText } of modelEntries) {
        const visible = !q || searchText.includes(q);
        option.hidden = !visible;
        if (visible) groupHasMatch = true;
      }
      group.hidden = !groupHasMatch;
      if (groupHasMatch) anyVisible = true;
    }

    emptyEl.hidden = anyVisible || !q;
  }

  // ── Auto-focus search whenever the picker opens ───────────────────────
  const observer = new MutationObserver(() => {
    if (panel.classList.contains('chat-model-picker--open')) {
      search.clear();
      filterGroups('');
      requestAnimationFrame(() => search.focus());
    }
  });
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] });

  const scrollbar = attachCustomScrollbar(panel, scroller);

  return {
    element: panel,
    dispose() {
      observer.disconnect();
      scrollbar.dispose();
    },
  };
}
