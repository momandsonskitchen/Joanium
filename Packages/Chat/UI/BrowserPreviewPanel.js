import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { SEARCH_ENGINE_SEARCH_URLS } from './Shared/DefaultSearchInfo.js';

const DEFAULT_BROWSER_PREVIEW_STATE = Object.freeze({
  visible: false,
  hasView: false,
  hasPage: false,
  title: '',
  url: '',
  status: '',
  loading: false,
  canGoBack: false,
  canGoForward: false,
});

function normalizeBrowserPreviewState(state = {}) {
  return { ...DEFAULT_BROWSER_PREVIEW_STATE, ...state };
}

function browserPreviewTone(state) {
  const status = String(state.status ?? '').toLowerCase();
  if (state.loading) return 'loading';
  if (/failed|error|unexpected|timeout/.test(status)) return 'error';
  if (state.visible && state.hasPage) return 'live';
  if (state.hasPage) return 'paused';
  return 'idle';
}

/**
 * Resolves a raw search-bar query to a fully qualified URL.
 * – If it already starts with http(s)://, use it as-is.
 * – If it looks like a bare hostname (e.g. "github.com"), prepend https://.
 * – Otherwise fall back to the configured search engine.
 */
function resolveSearchQuery(query, searchBaseUrl = SEARCH_ENGINE_SEARCH_URLS.google) {
  const trimmed = String(query ?? '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$)/i.test(trimmed)) return `https://${trimmed}`;
  return `${searchBaseUrl}${encodeURIComponent(trimmed)}`;
}

export function createBrowserPreviewPanel(strings, { onVisibilityChange } = {}) {
  let currentState = normalizeBrowserPreviewState();
  let disposeStateListener = null;
  let animationFrameId = 0;
  let lastBoundsKey = '';

  // Tracks whether the panel was opened from the composer browser button.
  // Only in that mode is the search bar visible.
  let searchBarVisible = false;
  // Tracks whether the user is actively typing in the search bar so we don't
  // clobber their input when a state update arrives with a URL.
  let searchBarFocused = false;
  // Active search engine's search-query base URL (set by showWithSearchBar).
  let activeSearchBaseUrl = SEARCH_ENGINE_SEARCH_URLS.google;
  // Suppresses the auto-close logic while the initial home-page navigation is
  // in flight — prevents the panel from closing before the browser has had a
  // chance to mark itself as visible.
  let suppressAutoClose = false;

  const panel = createElement('aside', 'browser-preview');
  panel.hidden = true;

  const header = createElement('div', 'browser-preview__header');
  const identity = createElement('div', 'browser-preview__identity');
  const eyebrow = createElement('div', 'browser-preview__eyebrow');
  eyebrow.append(createIcon('globe', 'browser-preview__eyebrow-icon'));
  const title = createElement('h2', 'browser-preview__title', strings.title);
  const urlLabel = createElement('div', 'browser-preview__url', strings.emptyUrl);
  identity.append(eyebrow, title, urlLabel);

  // ── Navigation controls (back, forward, reload) ─────────────────────────
  // These sit on the LEFT of the header in Chrome style.
  const navControls = createElement('div', 'browser-preview__nav-controls');
  const backButton = createElement('button', 'browser-preview__control');
  const forwardButton = createElement('button', 'browser-preview__control');
  const reloadButton = createElement('button', 'browser-preview__control');
  backButton.type = 'button';
  forwardButton.type = 'button';
  reloadButton.type = 'button';
  backButton.setAttribute('aria-label', strings.back);
  forwardButton.setAttribute('aria-label', strings.forward);
  reloadButton.setAttribute('aria-label', strings.reload);
  backButton.append(createIcon('arrowLeft', 'browser-preview__control-icon'));
  forwardButton.append(createIcon('arrowRight', 'browser-preview__control-icon'));
  reloadButton.append(createIcon('retry', 'browser-preview__control-icon'));
  navControls.append(backButton, forwardButton, reloadButton);

  // ── Close button sits on the far RIGHT ───────────────────────────────────
  const closeButton = createElement('button', 'browser-preview__control browser-preview__close');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', strings.close);
  closeButton.append(createIcon('close', 'browser-preview__control-icon'));

  // ── Omnibox (Chrome-style address bar) ───────────────────────────────────
  // Hidden until the user opens the browser from the composer button.
  // Lives INSIDE the header between navControls and closeButton so it expands
  // to fill the centre of the toolbar, exactly like Chrome's address bar.
  const searchBarWrap = createElement('div', 'browser-preview__search-bar-wrap');

  // Security / site-type indicator icon (lock, globe, etc.)
  const omniboxIcon = createElement('span', 'browser-preview__omnibox-icon');
  omniboxIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'browser-preview__search-input';
  searchInput.placeholder = strings.searchPlaceholder ?? 'Search or enter a URL';
  searchInput.setAttribute('aria-label', strings.searchPlaceholder ?? 'Search or enter URL');
  searchInput.autocomplete = 'off';
  searchInput.spellcheck = false;

  const searchGoBtn = createElement('button', 'browser-preview__search-go');
  searchGoBtn.type = 'button';
  searchGoBtn.setAttribute('aria-label', strings.searchGo ?? 'Go');
  searchGoBtn.append(createIcon('arrowRight', 'browser-preview__search-go-icon'));

  searchInput.readOnly = true;
  searchGoBtn.hidden = true;
  searchBarWrap.append(omniboxIcon, searchInput, searchGoBtn);

  // Header layout: [navControls] [identity|searchBar (flex:1)] [close]
  // CSS `order` swaps identity ↔ searchBar depending on mode.
  header.append(navControls, identity, searchBarWrap, closeButton);

  function submitSearch() {
    const resolved = resolveSearchQuery(searchInput.value, activeSearchBaseUrl);
    if (!resolved) return;
    // Update the input to the resolved URL so the user can see what was navigated to.
    searchInput.value = resolved;
    void invokeIpc('browser-preview:load-url', resolved).catch(() => {});
  }

  searchInput.addEventListener('focus', () => {
    searchBarFocused = true;
    // Select all text on focus so the user can immediately replace the URL.
    searchInput.select();
  });
  searchInput.addEventListener('blur', () => {
    searchBarFocused = false;
    // Hide the go button when the user leaves the input — Chrome behaviour.
    searchGoBtn.hidden = true;
  });
  searchInput.addEventListener('input', () => {
    // Show the go arrow as soon as the user starts typing — Chrome behaviour.
    if (!searchInput.readOnly) searchGoBtn.hidden = false;
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitSearch();
      searchGoBtn.hidden = true;
    }
    if (event.key === 'Escape') {
      searchInput.blur();
    }
  });
  searchGoBtn.addEventListener('click', () => {
    submitSearch();
    searchGoBtn.hidden = true;
  });
  // ────────────────────────────────────────────────────────────────────────

  const statusRow = createElement('div', 'browser-preview__status-row');
  const statusDot = createElement(
    'span',
    'browser-preview__status-dot browser-preview__status-dot--idle',
  );
  const statusText = createElement('span', 'browser-preview__status', strings.ready);
  statusRow.append(statusDot, statusText);

  const mount = createElement('div', 'browser-preview__mount');
  mount.id = 'browser-preview-mount';
  const viewport = createElement('div', 'browser-preview__viewport');
  const empty = createElement('div', 'browser-preview__empty');
  empty.append(
    createIcon('globe', 'browser-preview__empty-icon'),
    createElement('strong', 'browser-preview__empty-title', strings.emptyTitle),
    createElement('span', 'browser-preview__empty-copy', strings.emptyCopy),
  );
  mount.append(viewport, empty);
  panel.append(header, statusRow, mount);

  function setTone(tone) {
    statusDot.className = `browser-preview__status-dot browser-preview__status-dot--${tone}`;
    statusText.className = `browser-preview__status browser-preview__status--${tone}`;
  }

  async function syncBounds() {
    const shouldAttach = (currentState.visible || searchBarVisible) && !panel.hidden;
    let bounds = null;

    if (shouldAttach) {
      const rect = viewport.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        bounds = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }
    }

    const boundsKey = bounds ? `${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}` : 'null';
    if (boundsKey === lastBoundsKey) return;
    lastBoundsKey = boundsKey;
    await invokeIpc('browser-preview:set-bounds', bounds).catch(() => {
      lastBoundsKey = '';
    });
  }

  function scheduleBoundsSync() {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(() => {
      void syncBounds();
    });
  }

  function applyState(nextState) {
    currentState = normalizeBrowserPreviewState(nextState);

    // The panel is visible either because the main process says so OR because
    // the user opened it from the composer (search-bar mode).
    const visible = Boolean(currentState.visible) || searchBarVisible;
    panel.hidden = !visible;
    panel.classList.toggle('browser-preview--visible', visible);
    panel.classList.toggle('browser-preview--has-page', Boolean(currentState.hasPage));
    panel.classList.toggle('browser-preview--loading', Boolean(currentState.loading));
    panel.classList.toggle('browser-preview--search-bar-mode', searchBarVisible);
    onVisibilityChange?.(visible);

    title.textContent = currentState.title || strings.title;
    urlLabel.textContent = currentState.url || strings.emptyUrl;
    statusText.textContent =
      currentState.status || (currentState.loading ? strings.loading : strings.ready);
    setTone(browserPreviewTone(currentState));

    backButton.disabled = !currentState.canGoBack;
    forwardButton.disabled = !currentState.canGoForward;
    reloadButton.disabled = !currentState.hasPage;

    // Keep the search bar input in sync with the current page URL, but only
    // when the user isn't actively typing in it.
    if (!searchBarFocused && currentState.url) {
      searchInput.value = currentState.url;
      // Update the security icon based on the protocol.
      const isHttps = currentState.url.startsWith('https://');
      const isHttp = currentState.url.startsWith('http://');
      if (isHttps) {
        omniboxIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
        omniboxIcon.className =
          'browser-preview__omnibox-icon browser-preview__omnibox-icon--secure';
      } else if (isHttp) {
        omniboxIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        omniboxIcon.className = 'browser-preview__omnibox-icon browser-preview__omnibox-icon--warn';
      } else {
        omniboxIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
        omniboxIcon.className = 'browser-preview__omnibox-icon';
      }
    }

    // If the main process signals the browser was closed (visible → false) and
    // the search bar was open, close the whole panel and reset search-bar mode.
    // suppressAutoClose is true while the initial home navigation is in-flight,
    // preventing a premature close before the main process marks the view visible.
    if (!currentState.visible && searchBarVisible && !suppressAutoClose) {
      // Main process closed the browser — tear down search bar mode too.
      searchBarVisible = false;
      searchInput.readOnly = true;
      searchGoBtn.hidden = true;
      searchBarWrap.classList.remove('browser-preview__search-bar-wrap--editable');
      searchInput.value = '';
      panel.hidden = true;
      panel.classList.remove('browser-preview--search-bar-mode');
      onVisibilityChange?.(false);
      lastBoundsKey = '';
      void invokeIpc('browser-preview:set-bounds', null).catch(() => {});
      return;
    }

    scheduleBoundsSync();
  }

  backButton.addEventListener('click', () => {
    void invokeIpc('browser-preview:go-back');
  });
  forwardButton.addEventListener('click', () => {
    void invokeIpc('browser-preview:go-forward');
  });
  reloadButton.addEventListener('click', () => {
    void invokeIpc('browser-preview:reload');
  });
  closeButton.addEventListener('click', () => {
    // If opened from composer, also tear down search-bar mode.
    if (searchBarVisible) {
      searchBarVisible = false;
      searchInput.readOnly = true;
      searchGoBtn.hidden = true;
      searchBarWrap.classList.remove('browser-preview__search-bar-wrap--editable');
      searchInput.value = '';
      panel.classList.remove('browser-preview--search-bar-mode');
    }
    void invokeIpc('browser-preview:close')
      .then(applyState)
      .catch(() => {
        // Manually hide if IPC fails.
        panel.hidden = true;
        onVisibilityChange?.(false);
      });
  });

  return {
    element: panel,
    start() {
      disposeStateListener = onIpc('browser-preview:state', applyState);
      window.addEventListener('resize', scheduleBoundsSync);
      invokeIpc('browser-preview:get-state')
        .then(applyState)
        .catch(() => applyState(DEFAULT_BROWSER_PREVIEW_STATE));
    },
    stop() {
      disposeStateListener?.();
      disposeStateListener = null;
      window.removeEventListener('resize', scheduleBoundsSync);
      cancelAnimationFrame(animationFrameId);
      void invokeIpc('browser-preview:set-bounds', null);
    },
    // Detach the native view without closing it — called when the user leaves chat.
    pause() {
      void invokeIpc('browser-preview:pause');
    },
    // Re-attach the native view — called when the user returns to chat.
    resume() {
      void invokeIpc('browser-preview:resume');
    },
    /**
     * Open the browser panel with the search bar visible and navigate to the
     * default search engine homepage.
     *
     * @param {string} homeUrl        - The homepage URL to navigate to immediately.
     * @param {string} searchEngineKey - Key from SEARCH_ENGINE_SEARCH_URLS used
     *                                   when the user submits a plain-text query.
     *
     * Called exclusively from the composer browser button. The search bar is
     * never shown when the browser opens via a message link click.
     */
    showWithSearchBar(homeUrl = 'https://www.google.com', searchEngineKey = 'google') {
      if (searchBarVisible) {
        // Already open — just re-focus the search bar.
        searchInput.focus();
        return;
      }

      // Update the active search engine so typed queries use the right backend.
      activeSearchBaseUrl =
        SEARCH_ENGINE_SEARCH_URLS[searchEngineKey] ?? SEARCH_ENGINE_SEARCH_URLS.google;

      searchBarVisible = true;

      // Suppress the applyState auto-close guard while the initial navigation is
      // in-flight. Without this, syncBounds() triggers a state event from the
      // main process with { visible: false } (no page loaded yet) which would
      // immediately tear down the panel we just opened.
      suppressAutoClose = true;

      searchInput.readOnly = false;
      searchBarWrap.classList.add('browser-preview__search-bar-wrap--editable');
      panel.hidden = false;
      panel.classList.add('browser-preview--visible', 'browser-preview--search-bar-mode');
      onVisibilityChange?.(true);

      // Navigate to the home URL immediately so the main process makes the
      // BrowserView visible before the first state event arrives.
      void invokeIpc('browser-preview:load-url', homeUrl)
        .catch(() => {})
        .finally(() => {
          suppressAutoClose = false;
        });

      scheduleBoundsSync();
      // Let the layout settle before focusing so the input is fully rendered.
      requestAnimationFrame(() => {
        searchInput.value = homeUrl;
        searchInput.focus();
        searchInput.select();
      });
    },
    /** Whether the panel is currently in search-bar (composer-opened) mode. */
    isSearchBarVisible() {
      return searchBarVisible;
    },
  };
}
