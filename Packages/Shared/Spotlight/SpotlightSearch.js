// ══════════════════════════════════════════════════════════════════════════
//  Joanium — Spotlight Search
//  macOS-style universal search. Single floating input, categorized
//  results dropdown, keyboard-driven navigation.
//
//  Usage:
//    import { createSpotlightSearch } from '../../Shared/Spotlight/SpotlightSearch.js';
//
//    const spotlight = createSpotlightSearch({
//      providers: [
//        {
//          id: 'conversations',
//          label: 'Conversations',
//          icon: 'tabHistory',
//          search: async (query) => [
//            { id: '1', label: 'Session title', hint: 'Apr 12', onSelect: () => {} },
//          ],
//        },
//      ],
//      onResultSelect: (result) => { /* navigate */ },
//    });
//    document.body.append(spotlight.element);
//    spotlight.toggle();
//
//  API:
//    spotlight.element   — root DOM node to mount
//    spotlight.toggle()  — open / close
//    spotlight.open()    — open
//    spotlight.close()   — close
//    spotlight.isOpen()  — boolean
// ══════════════════════════════════════════════════════════════════════════

const SEARCH_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
  </svg>
`;

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
`;

const CATEGORY_ICONS = {
  conversations: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  memory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14v-6m0-4h.01"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  templates: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>`,
  skills: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  personas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  navigate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
};

/**
 * Truncates text and adds ellipsis if needed.
 */
function truncate(text, maxLen = 60) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '\u2026';
}

/**
 * @param {object} options
 * @param {Array<{ id: string, label: string, icon?: string,
 *   search: (query: string) => Promise<Array<{ id: string, label: string,
 *     hint?: string, category?: string, onSelect: () => void }>>
 * }>} options.providers — search providers, each returns results for a query
 * @returns {{ element: HTMLElement, toggle(), open(), close(), isOpen() }}
 */
export function createSpotlightSearch({ providers = [] } = {}) {
  let open = false;
  let activeResultIndex = -1;
  let allResults = [];
  let debounceTimer = null;
  let searchId = 0;

  // ── Backdrop ──────────────────────────────────────────────────────────
  const backdrop = document.createElement('div');
  backdrop.className = 'spotlight-backdrop';

  // ── Search bar ────────────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.className = 'spotlight';

  const searchRow = document.createElement('div');
  searchRow.className = 'spotlight__search-row';

  const iconEl = document.createElement('span');
  iconEl.className = 'spotlight__icon';
  iconEl.innerHTML = SEARCH_ICON;

  const input = document.createElement('input');
  input.className = 'spotlight__input';
  input.type = 'text';
  input.placeholder = 'Spotlight Search\u2026';
  input.spellcheck = false;
  input.autocomplete = 'off';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'spotlight__close';
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute('aria-label', 'Close search');

  searchRow.append(iconEl, input, closeBtn);

  // ── Results dropdown ──────────────────────────────────────────────────
  const results = document.createElement('div');
  results.className = 'spotlight__results';
  results.hidden = true;

  const resultsList = document.createElement('div');
  resultsList.className = 'spotlight__results-list';
  results.append(resultsList);

  // ── Empty / loading states ────────────────────────────────────────────
  const emptyState = document.createElement('div');
  emptyState.className = 'spotlight__empty';
  emptyState.textContent = 'No results found';

  const loadingState = document.createElement('div');
  loadingState.className = 'spotlight__loading';
  loadingState.textContent = 'Searching\u2026';

  // ── Assemble ──────────────────────────────────────────────────────────
  bar.append(searchRow, results);
  backdrop.append(bar);

  // ── Dragging (by the search row, excluding interactive elements) ──────
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  searchRow.addEventListener('mousedown', (e) => {
    if (e.target === input || e.target.closest('.spotlight__close')) {
      return;
    }
    isDragging = true;
    const rect = bar.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    bar.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;
    const maxX = window.innerWidth - bar.offsetWidth;
    const maxY = window.innerHeight - bar.offsetHeight;
    bar.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    bar.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    bar.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    bar.style.transition = '';
  });

  // ── Result rendering ──────────────────────────────────────────────────

  function renderResults(grouped, query) {
    resultsList.replaceChildren();
    activeResultIndex = -1;
    allResults = [];

    const hasAny = Object.values(grouped).some((items) => items.length > 0);

    if (!query) {
      results.hidden = true;
      return;
    }

    if (!hasAny) {
      resultsList.append(emptyState);
      results.hidden = false;
      return;
    }

    for (const [providerId, items] of Object.entries(grouped)) {
      if (items.length === 0) continue;

      const provider = providers.find((p) => p.id === providerId);
      const section = document.createElement('div');
      section.className = 'spotlight-result-section';

      const header = document.createElement('div');
      header.className = 'spotlight-result-section__header';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'spotlight-result-section__icon';
      iconSpan.innerHTML = CATEGORY_ICONS[providerId] ?? CATEGORY_ICONS.navigate;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'spotlight-result-section__label';
      labelSpan.textContent = provider?.label ?? providerId;
      header.append(iconSpan, labelSpan);
      section.append(header);

      for (const item of items) {
        const globalIndex = allResults.length;
        allResults.push(item);

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'spotlight-result';
        row.dataset.index = String(globalIndex);

        const labelEl = document.createElement('span');
        labelEl.className = 'spotlight-result__label';
        labelEl.textContent = truncate(item.label, 80);

        row.append(labelEl);

        if (item.hint) {
          const hintEl = document.createElement('span');
          hintEl.className = 'spotlight-result__hint';
          hintEl.textContent = item.hint;
          row.append(hintEl);
        }

        row.addEventListener('mouseenter', () => {
          setActiveResult(globalIndex);
        });

        row.addEventListener('click', () => {
          item.onSelect?.();
          closeSpotlight();
        });

        section.append(row);
      }

      resultsList.append(section);
    }

    results.hidden = allResults.length === 0;
    if (allResults.length > 0) {
      setActiveResult(0);
    }
  }

  function setActiveResult(index) {
    activeResultIndex = index;
    const rows = resultsList.querySelectorAll('.spotlight-result');
    for (const row of rows) {
      const isActive = Number(row.dataset.index) === index;
      row.classList.toggle('spotlight-result--active', isActive);
      if (isActive) {
        row.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ── Search logic ──────────────────────────────────────────────────────

  async function performSearch() {
    const query = input.value.trim();
    const currentSearchId = ++searchId;

    if (!query) {
      results.hidden = true;
      resultsList.replaceChildren();
      allResults = [];
      activeResultIndex = -1;
      return;
    }

    resultsList.replaceChildren(loadingState);
    results.hidden = false;

    const grouped = {};

    const searches = providers.map(async (provider) => {
      try {
        const items = await provider.search(query);
        grouped[provider.id] = Array.isArray(items) ? items : [];
      } catch {
        grouped[provider.id] = [];
      }
    });

    await Promise.allSettled(searches);

    if (currentSearchId !== searchId) return;
    renderResults(grouped, query);
  }

  function debouncedSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 180);
  }

  // ── Open / Close ──────────────────────────────────────────────────────

  function openSpotlight() {
    if (open) return;
    open = true;
    backdrop.classList.add('spotlight-backdrop--visible');
    bar.classList.add('spotlight--open');
    input.value = '';
    results.hidden = true;
    resultsList.replaceChildren();
    allResults = [];
    activeResultIndex = -1;
    requestAnimationFrame(() => input.focus());
  }

  function closeSpotlight() {
    if (!open) return;
    open = false;
    backdrop.classList.remove('spotlight-backdrop--visible');
    bar.classList.remove('spotlight--open');
    input.value = '';
    results.hidden = true;
    resultsList.replaceChildren();
    allResults = [];
    activeResultIndex = -1;
    searchId += 1;
    clearTimeout(debounceTimer);
  }

  function toggleSpotlight() {
    if (open) closeSpotlight();
    else openSpotlight();
  }

  // ── Event wiring ──────────────────────────────────────────────────────

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSpotlight();
  });

  input.addEventListener('input', debouncedSearch);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSpotlight();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allResults.length > 0) {
        const next = activeResultIndex < allResults.length - 1 ? activeResultIndex + 1 : 0;
        setActiveResult(next);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allResults.length > 0) {
        const prev = activeResultIndex > 0 ? activeResultIndex - 1 : allResults.length - 1;
        setActiveResult(prev);
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeResultIndex >= 0 && activeResultIndex < allResults.length) {
        allResults[activeResultIndex].onSelect?.();
        closeSpotlight();
      }
    }
  });

  closeBtn.addEventListener('click', closeSpotlight);

  // ── Public API ────────────────────────────────────────────────────────
  return {
    element: backdrop,
    toggle: toggleSpotlight,
    open: openSpotlight,
    close: closeSpotlight,
    isOpen: () => open,
  };
}
