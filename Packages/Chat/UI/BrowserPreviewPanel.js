import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

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

export function createBrowserPreviewPanel(strings, { onVisibilityChange } = {}) {
  let currentState = normalizeBrowserPreviewState();
  let disposeStateListener = null;
  let animationFrameId = 0;
  let lastBoundsKey = '';

  const panel = createElement('aside', 'browser-preview');
  panel.hidden = true;

  const header = createElement('div', 'browser-preview__header');
  const identity = createElement('div', 'browser-preview__identity');
  const eyebrow = createElement('div', 'browser-preview__eyebrow');
  eyebrow.append(
    createIcon('globe', 'browser-preview__eyebrow-icon'),
    createElement('span', '', strings.eyebrow),
  );
  const title = createElement('h2', 'browser-preview__title', strings.title);
  const urlLabel = createElement('div', 'browser-preview__url', strings.emptyUrl);
  identity.append(eyebrow, title, urlLabel);

  const controls = createElement('div', 'browser-preview__controls');
  const backButton = createElement('button', 'browser-preview__control');
  const forwardButton = createElement('button', 'browser-preview__control');
  const reloadButton = createElement('button', 'browser-preview__control');
  const closeButton = createElement('button', 'browser-preview__control');
  backButton.type = 'button';
  forwardButton.type = 'button';
  reloadButton.type = 'button';
  closeButton.type = 'button';
  backButton.setAttribute('aria-label', strings.back);
  forwardButton.setAttribute('aria-label', strings.forward);
  reloadButton.setAttribute('aria-label', strings.reload);
  closeButton.setAttribute('aria-label', strings.close);
  backButton.append(createIcon('arrowLeft', 'browser-preview__control-icon'));
  forwardButton.append(createIcon('arrowRight', 'browser-preview__control-icon'));
  reloadButton.append(createIcon('retry', 'browser-preview__control-icon'));
  closeButton.append(createIcon('close', 'browser-preview__control-icon'));
  controls.append(backButton, forwardButton, reloadButton, closeButton);
  header.append(identity, controls);

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
    const shouldAttach = currentState.visible && !panel.hidden;
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
    const visible = Boolean(currentState.visible);
    panel.hidden = !visible;
    panel.classList.toggle('browser-preview--visible', visible);
    panel.classList.toggle('browser-preview--has-page', Boolean(currentState.hasPage));
    panel.classList.toggle('browser-preview--loading', Boolean(currentState.loading));
    onVisibilityChange?.(visible);

    title.textContent = currentState.title || strings.title;
    urlLabel.textContent = currentState.url || strings.emptyUrl;
    statusText.textContent =
      currentState.status || (currentState.loading ? strings.loading : strings.ready);
    setTone(browserPreviewTone(currentState));

    backButton.disabled = !currentState.canGoBack;
    forwardButton.disabled = !currentState.canGoForward;
    reloadButton.disabled = !currentState.hasPage;

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
    void invokeIpc('browser-preview:close')
      .then(applyState)
      .catch(() => {});
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
  };
}
