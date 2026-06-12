import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKETPLACE_API_BASE = 'https://www.joanium.com/api/marketplace';
const PAGE_LIMIT = 30; // items per page
const SCROLL_THRESHOLD_PX = 140; // px from bottom before next page loads

// ---------------------------------------------------------------------------
// API helpers — run in the renderer (Electron has no CORS restrictions)
// ---------------------------------------------------------------------------

async function fetchItems({ type, search = '', page = 1, limit = PAGE_LIMIT }) {
  const url = new URL(`${MARKETPLACE_API_BASE}/items`);
  url.searchParams.set('type', type);
  url.searchParams.set('sort', 'az');
  url.searchParams.set('filter', 'all');
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (search) url.searchParams.set('q', search);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchItemDetail(type, publisher, filename) {
  const url = `${MARKETPLACE_API_BASE}/items/${encodeURIComponent(type)}/${encodeURIComponent(publisher)}/${encodeURIComponent(filename)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function downloadMarkdown(type, publisher, filename) {
  const url = `${MARKETPLACE_API_BASE}/download/${encodeURIComponent(type)}/${encodeURIComponent(publisher)}/${encodeURIComponent(filename)}`;
  const response = await fetch(url, {
    headers: { Accept: 'text/markdown, text/plain;q=0.9, */*;q=0.8' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

// ---------------------------------------------------------------------------
// Panel factory
// ---------------------------------------------------------------------------

export function createMarketplacePanel(strings) {
  let panel = null;
  let _listEl = null;
  let _search = null;
  let _viewerEl = null;
  let _activeType = 'skills';
  let _activeCard = null;

  // ── Pagination state — reset on every new query / type switch ────────────
  let _currentQuery = '';
  let _currentPage = 1;
  let _hasMore = false;
  let _isFetchingMore = false;
  // Generation counter: incremented on every fresh populateList call so that
  // in-flight fetchMore calls from a previous query are silently discarded.
  let _fetchGeneration = 0;

  // In-memory set of installed item IDs for this panel session.
  const _installedIds = new Set();

  // ── build ────────────────────────────────────────────────────────────────

  function build() {
    panel = createElement('div', 'marketplace');
    panel.hidden = true;

    // ── Header ────────────────────────────────────────────────────────────
    const header = createElement('div', 'marketplace__header');

    const headerTop = createElement('div', 'marketplace__header-top');

    const headerText = createPanelHeader({ title: strings.title, subtitle: strings.subtitle });

    // Type toggle (Skills | Personas)
    const toggle = createElement('div', 'marketplace__toggle');
    const skillsBtn = createElement(
      'button',
      'marketplace__toggle-btn marketplace__toggle-btn--active',
    );
    const personasBtn = createElement('button', 'marketplace__toggle-btn');
    skillsBtn.type = 'button';
    personasBtn.type = 'button';
    skillsBtn.textContent = strings.skillsLabel;
    personasBtn.textContent = strings.personasLabel;

    skillsBtn.addEventListener('click', () => {
      if (_activeType === 'skills') return;
      _activeType = 'skills';
      skillsBtn.classList.add('marketplace__toggle-btn--active');
      personasBtn.classList.remove('marketplace__toggle-btn--active');
      _activeCard = null;
      resetViewer();
      void populateList(_listEl, _search.getValue().trim());
    });

    personasBtn.addEventListener('click', () => {
      if (_activeType === 'personas') return;
      _activeType = 'personas';
      personasBtn.classList.add('marketplace__toggle-btn--active');
      skillsBtn.classList.remove('marketplace__toggle-btn--active');
      _activeCard = null;
      resetViewer();
      void populateList(_listEl, _search.getValue().trim());
    });

    toggle.append(skillsBtn, personasBtn);
    headerTop.append(headerText, toggle);
    header.append(headerTop);
    panel.append(header);

    // ── Two-column body ───────────────────────────────────────────────────
    const body = createElement('div', 'marketplace__body');

    // Left column — frosted-glass card: search + list
    const listCol = createElement('div', 'marketplace__list-col');
    const listCard = createElement('div', 'marketplace__list-card');

    const searchWrap = createElement('div', 'marketplace__list-search');
    _search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(_listEl, value.trim()),
    });
    searchWrap.append(_search.element);

    _listEl = createElement('div', 'marketplace__list-content');
    const listWrap = createElement('div', 'marketplace__list-wrap');
    Object.assign(listWrap.style, {
      flex: 1,
      minHeight: 0,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    });
    listWrap.append(_listEl);
    attachCustomScrollbar(listWrap, _listEl, { right: 4, top: 4, bottom: 4, minThumb: 24 });

    // Infinite-scroll listener on the scrollable list container
    _listEl.addEventListener('scroll', () => {
      if (!_hasMore || _isFetchingMore) return;
      const { scrollTop, scrollHeight, clientHeight } = _listEl;
      if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD_PX) {
        void loadMoreItems(_listEl);
      }
    });

    listCard.append(searchWrap, listWrap);
    listCol.append(listCard);

    // Right column — viewer card
    const viewerCol = createElement('div', 'marketplace__viewer-col');
    _viewerEl = createElement('div', 'marketplace__viewer-card');
    resetViewer();
    viewerCol.append(_viewerEl);

    body.append(listCol, viewerCol);
    panel.append(body);

    // Expose internals for ChatApp to call populateList on mount
    panel._listEl = _listEl;
    panel._search = _search;
    panel._viewerEl = _viewerEl;

    return panel;
  }

  // ── resetViewer ───────────────────────────────────────────────────────────

  function resetViewer() {
    if (!_viewerEl) return;
    _viewerEl.replaceChildren();
    _viewerEl.append(createElement('div', 'marketplace__viewer-empty', strings.selectPrompt));
  }

  // ── populateList — fetches page 1, resets all pagination state ────────────

  async function populateList(listEl, query = '') {
    if (!listEl) return;

    // Bump generation so any in-flight loadMoreItems calls for the previous
    // query will see a stale generation and bail out.
    _fetchGeneration += 1;
    const generation = _fetchGeneration;

    _currentQuery = query;
    _currentPage = 1;
    _hasMore = false;
    _isFetchingMore = false;

    listEl.replaceChildren();

    // Skeleton placeholders for the initial load
    for (let i = 0; i < 8; i++) {
      listEl.append(createElement('div', 'marketplace__skeleton'));
    }

    let data;
    try {
      data = await fetchItems({ type: _activeType, search: query, page: 1 });
    } catch {
      if (generation !== _fetchGeneration) return; // stale
      listEl.replaceChildren();
      const err = createElement('div', 'marketplace__empty');
      err.append(
        createElement('p', 'marketplace__empty-title', strings.loadFailed),
        createElement('p', 'marketplace__empty-hint', strings.loadFailedHint),
      );
      listEl.append(err);
      return;
    }

    if (generation !== _fetchGeneration) return; // stale — a newer query replaced us

    const items = Array.isArray(data?.items) ? data.items : [];
    _hasMore = Boolean(data?.hasMore);
    _currentPage = Number(data?.page ?? 1);

    listEl.replaceChildren();

    if (items.length === 0) {
      const empty = createElement('div', 'marketplace__empty');
      empty.append(
        createElement('p', 'marketplace__empty-title', query ? strings.noResults : strings.empty),
        createElement(
          'p',
          'marketplace__empty-hint',
          query ? strings.noResultsHint : strings.emptyHint,
        ),
      );
      listEl.append(empty);
      return;
    }

    for (const item of items) {
      listEl.append(buildItemCard(item));
    }

    // Append a sentinel at the bottom used as the fetch-more trigger
    listEl.append(buildLoadMoreSentinel());
  }

  // ── loadMoreItems — appends the next page without wiping the list ─────────

  async function loadMoreItems(listEl) {
    if (!_hasMore || _isFetchingMore) return;

    const generation = _fetchGeneration;
    _isFetchingMore = true;

    // Replace sentinel with inline skeletons while loading
    const sentinel = listEl.querySelector('.marketplace__load-sentinel');
    if (sentinel) sentinel.remove();

    const skeletonCount = 4;
    const skeletons = [];
    for (let i = 0; i < skeletonCount; i++) {
      const sk = createElement('div', 'marketplace__skeleton marketplace__skeleton--append');
      listEl.append(sk);
      skeletons.push(sk);
    }

    let data;
    try {
      data = await fetchItems({
        type: _activeType,
        search: _currentQuery,
        page: _currentPage + 1,
      });
    } catch {
      skeletons.forEach((sk) => sk.remove());
      _isFetchingMore = false;
      if (generation === _fetchGeneration) {
        listEl.append(buildLoadMoreSentinel()); // keep sentinel so retry is possible
      }
      return;
    }

    skeletons.forEach((sk) => sk.remove());
    _isFetchingMore = false;

    if (generation !== _fetchGeneration) return; // stale

    const items = Array.isArray(data?.items) ? data.items : [];
    _hasMore = Boolean(data?.hasMore);
    _currentPage = Number(data?.page ?? _currentPage + 1);

    for (const item of items) {
      listEl.append(buildItemCard(item));
    }

    if (_hasMore) {
      listEl.append(buildLoadMoreSentinel());
    }
  }

  // ── buildLoadMoreSentinel — invisible div watched by the scroll listener ──

  function buildLoadMoreSentinel() {
    return createElement('div', 'marketplace__load-sentinel');
  }

  // ── populateViewer — loads item detail and renders the right column ───────

  async function populateViewer(item) {
    if (!_viewerEl) return;

    _viewerEl.replaceChildren();
    const loadingEl = createElement('div', 'marketplace__viewer-loading');
    loadingEl.append(createElement('span', 'marketplace__viewer-loading-dot'));
    loadingEl.append(createElement('span', 'marketplace__viewer-loading-dot'));
    loadingEl.append(createElement('span', 'marketplace__viewer-loading-dot'));
    _viewerEl.append(loadingEl);

    let detail;
    try {
      detail = await fetchItemDetail(_activeType, item.publisher, item.filename);
    } catch {
      _viewerEl.replaceChildren();
      _viewerEl.append(createElement('div', 'marketplace__viewer-empty', strings.loadFailed));
      return;
    }

    _viewerEl.replaceChildren();

    const itemId = detail.id ?? `${_activeType}/${detail.publisher}/${detail.filename}`;
    const isInstalled = _installedIds.has(itemId);

    // ── Viewer header ─────────────────────────────────────────────────────
    const header = createElement('div', 'marketplace__viewer-header');

    const headerLeft = createElement('div', 'marketplace__viewer-header-left');

    const nameRow = createElement('div', 'marketplace__viewer-name-row');
    nameRow.append(createElement('h3', 'marketplace__viewer-title', detail.name ?? item.name));

    if (detail.verified || detail.isVerified) {
      const badge = createElement('span', 'marketplace__verified-badge');
      badge.append(
        createIcon('verified', 'marketplace__verified-icon'),
        createElement('span', 'marketplace__verified-label', strings.verified),
      );
      nameRow.append(badge);
    }
    headerLeft.append(nameRow);

    const metaRow = createElement('div', 'marketplace__viewer-meta-row');
    metaRow.append(
      createElement('span', 'marketplace__viewer-author-label', strings.author),
      createElement('span', 'marketplace__viewer-author-value', detail.publisher ?? item.publisher),
    );

    if (detail.downloads) {
      metaRow.append(createElement('span', 'marketplace__viewer-sep', '·'));
      const dlEl = createElement('span', 'marketplace__viewer-downloads');
      dlEl.append(createIcon('download', 'marketplace__viewer-dl-icon'));
      dlEl.append(document.createTextNode(` ${detail.downloads}`));
      metaRow.append(dlEl);
    }

    if (detail.stars) {
      metaRow.append(createElement('span', 'marketplace__viewer-sep', '·'));
      const starEl = createElement('span', 'marketplace__viewer-stars');
      starEl.append(createIcon('star', 'marketplace__viewer-star-icon'));
      starEl.append(document.createTextNode(` ${detail.stars}`));
      metaRow.append(starEl);
    }

    headerLeft.append(metaRow);
    header.append(headerLeft);

    // Install button
    const installBtn = createElement('button', 'marketplace__install-btn');
    installBtn.type = 'button';

    function renderInstallDefault() {
      installBtn.disabled = false;
      installBtn.className = 'marketplace__install-btn';
      installBtn.replaceChildren();
      installBtn.append(createIcon('download', 'marketplace__install-btn-icon'));
      installBtn.append(createElement('span', 'marketplace__install-btn-label', strings.install));
    }

    function renderInstalling() {
      installBtn.disabled = true;
      installBtn.className = 'marketplace__install-btn marketplace__install-btn--installing';
      installBtn.replaceChildren();
      installBtn.append(createElement('span', 'marketplace__install-spinner'));
      installBtn.append(
        createElement('span', 'marketplace__install-btn-label', strings.installing),
      );
    }

    function renderInstalled() {
      installBtn.disabled = true;
      installBtn.className = 'marketplace__install-btn marketplace__install-btn--installed';
      installBtn.replaceChildren();
      installBtn.append(createIcon('check', 'marketplace__install-btn-icon'));
      installBtn.append(createElement('span', 'marketplace__install-btn-label', strings.installed));
    }

    function renderError() {
      installBtn.disabled = false;
      installBtn.className = 'marketplace__install-btn marketplace__install-btn--error';
      installBtn.replaceChildren();
      installBtn.append(
        createElement('span', 'marketplace__install-btn-label', strings.installFailed),
      );
      setTimeout(() => renderInstallDefault(), 2500);
    }

    if (isInstalled) {
      renderInstalled();
    } else {
      renderInstallDefault();
    }

    installBtn.addEventListener('click', async () => {
      if (installBtn.disabled) return;
      renderInstalling();
      try {
        let markdown = detail.markdown?.trim();
        if (!markdown) {
          markdown = await downloadMarkdown(_activeType, detail.publisher, detail.filename);
        }
        await invokeIpc(
          'marketplace:install-item',
          _activeType,
          detail.publisher,
          detail.filename,
          markdown,
        );
        _installedIds.add(itemId);
        renderInstalled();
        _activeCard?.classList.add('marketplace__card--installed');
      } catch (err) {
        console.error('[Joanium] Marketplace install failed:', err);
        renderError();
      }
    });

    header.append(installBtn);
    _viewerEl.append(header);

    // Trigger / personality tag
    const tagValue =
      _activeType === 'personas'
        ? (detail.personality ?? detail.meta?.personality ?? '')
        : (detail.trigger ?? detail.meta?.trigger ?? '');

    if (tagValue) {
      const tagRow = createElement('div', 'marketplace__viewer-tag-row');
      const tagLabel = _activeType === 'personas' ? strings.personality : strings.trigger;
      tagRow.append(
        createElement('span', 'marketplace__viewer-tag-label', tagLabel),
        createElement('span', 'marketplace__viewer-tag-value', tagValue),
      );
      _viewerEl.append(tagRow);
    }

    // Description / excerpt
    const description = (detail.description || detail.excerpt || '').trim();
    if (description) {
      _viewerEl.append(createElement('p', 'marketplace__viewer-desc', description));
    }

    // Markdown content
    const markdown = (detail.markdown || '').trim();
    if (markdown) {
      const contentEl = createElement('div', 'marketplace__viewer-content');
      contentEl.append(renderMarkdown(markdown, 'marketplace__viewer-md'));
      _viewerEl.append(contentEl);
    }
  }

  // ── buildItemCard — one row in the left list ──────────────────────────────

  function buildItemCard(item) {
    const itemId = item.id ?? `${_activeType}/${item.publisher}/${item.filename}`;
    const card = createElement('div', 'marketplace__card');

    if (_installedIds.has(itemId)) card.classList.add('marketplace__card--installed');

    card.addEventListener('click', () => {
      _activeCard?.classList.remove('marketplace__card--active');
      card.classList.add('marketplace__card--active');
      _activeCard = card;
      void populateViewer(item);
    });

    const body = createElement('div', 'marketplace__card-body');

    const nameRow = createElement('div', 'marketplace__card-name-row');
    nameRow.append(createElement('span', 'marketplace__card-name', item.name));

    if (item.verified || item.isVerified) {
      const badge = createElement('span', 'marketplace__card-verified');
      badge.append(createIcon('verified', 'marketplace__card-verified-icon'));
      nameRow.append(badge);
    }
    body.append(nameRow);

    const desc = (item.description || item.excerpt || '').trim();
    if (desc) body.append(createElement('div', 'marketplace__card-desc', desc));

    const metaRow = createElement('div', 'marketplace__card-meta');
    metaRow.append(createElement('span', 'marketplace__card-publisher', item.publisher ?? ''));

    if (item.downloads) {
      const dlSpan = createElement('span', 'marketplace__card-downloads');
      dlSpan.append(createIcon('download', 'marketplace__card-dl-icon'));
      dlSpan.append(document.createTextNode(` ${item.downloads}`));
      metaRow.append(dlSpan);
    }

    body.append(metaRow);
    card.append(body);
    return card;
  }

  // ── Public interface ──────────────────────────────────────────────────────

  return { build, populateList };
}
