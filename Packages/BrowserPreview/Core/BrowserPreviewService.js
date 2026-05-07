import { BrowserWindow, WebContentsView } from 'electron';

export const BUILTIN_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

function normalizeUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error('A URL is required.');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.startsWith('file://')) return raw;
  return `https://${raw}`;
}

function normalizeBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return null;
  const width = Math.round(Number(bounds.width));
  const height = Math.round(Number(bounds.height));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: Math.max(0, Math.round(Number(bounds.x) || 0)),
    y: Math.max(0, Math.round(Number(bounds.y) || 0)),
    width: Math.max(1, width),
    height: Math.max(1, height)
  };
}

function getViewWebContents(view) {
  return view?.webContents ?? null;
}

function canGoBack(webContents) {
  return Boolean(webContents?.navigationHistory?.canGoBack?.() ?? webContents?.canGoBack?.());
}

function canGoForward(webContents) {
  return Boolean(webContents?.navigationHistory?.canGoForward?.() ?? webContents?.canGoForward?.());
}

export function createBrowserPreviewService() {
  let windowRef = null;
  let view = null;
  let viewAttached = false;
  let visible = false;
  let hostBounds = null;
  let title = 'Browser Preview';
  let url = '';
  let status = 'Ready';
  let loading = false;
  let resizeHandler = null;

  function getFallbackBounds() {
    const targetWindow = windowRef ?? BrowserWindow.getAllWindows()[0] ?? null;
    if (!targetWindow || targetWindow.isDestroyed()) return null;
    const [width, height] = targetWindow.getContentSize();
    const x = Math.round(width * 0.58);
    const y = 68;
    return {
      x,
      y,
      width: Math.max(320, width - x - 28),
      height: Math.max(320, height - y - 32)
    };
  }

  function getState() {
    const webContents = getViewWebContents(view);

    return {
      visible,
      hasView: Boolean(view),
      hasPage: Boolean(url),
      title,
      url,
      status,
      loading,
      canGoBack: canGoBack(webContents),
      canGoForward: canGoForward(webContents)
    };
  }

  function emitState() {
    const targetWindow = windowRef ?? BrowserWindow.getAllWindows()[0] ?? null;
    if (!targetWindow || targetWindow.isDestroyed()) return;
    targetWindow.webContents.send('browser-preview:state', getState());
  }

  function updateBounds() {
    if (!view || !viewAttached) return;
    const nextBounds = hostBounds ?? getFallbackBounds();
    if (!nextBounds) return;
    view.setBounds(nextBounds);
    view.setVisible(true);
  }

  function detach() {
    if (!windowRef || !view || !viewAttached) return;
    if (!windowRef.isDestroyed()) {
      windowRef.contentView.removeChildView(view);
    }
    view.setVisible(false);
    viewAttached = false;
  }

  function attach() {
    if (!visible || !view) return;
    const targetWindow = windowRef ?? BrowserWindow.getAllWindows()[0] ?? null;
    if (!targetWindow || targetWindow.isDestroyed()) return;
    windowRef = targetWindow;

    if (!viewAttached) {
      windowRef.contentView.addChildView(view);
      viewAttached = true;
    }

    updateBounds();
  }

  function attachToWindow(nextWindow) {
    if (!nextWindow || nextWindow.isDestroyed() || windowRef === nextWindow) return;

    if (resizeHandler && windowRef && !windowRef.isDestroyed()) {
      windowRef.off('resize', resizeHandler);
    }

    detach();
    windowRef = nextWindow;
    resizeHandler = () => updateBounds();
    windowRef.on('resize', resizeHandler);
    attach();
    emitState();
  }

  function wireViewEvents(webContents) {
    webContents.setWindowOpenHandler(({ url: nextUrl }) => {
      if (nextUrl) {
        loadUrl(nextUrl).catch(() => {});
      }
      return { action: 'deny' };
    });

    webContents.on('page-title-updated', (event, nextTitle) => {
      event.preventDefault();
      title = nextTitle || 'Browser Preview';
      emitState();
    });

    webContents.on('did-start-loading', () => {
      loading = true;
      status = 'Loading page...';
      emitState();
    });

    webContents.on('did-stop-loading', () => {
      loading = false;
      title = webContents.getTitle() || title;
      url = webContents.getURL() || url;
      status = 'Ready';
      emitState();
    });

    webContents.on('did-navigate', (_event, nextUrl) => {
      url = nextUrl || url;
      emitState();
    });

    webContents.on('did-navigate-in-page', (_event, nextUrl) => {
      url = nextUrl || url;
      emitState();
    });

    webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (!isMainFrame) return;
      loading = false;
      url = validatedUrl || url;
      status = `Load failed (${errorCode}): ${errorDescription}`;
      emitState();
    });

    webContents.on('render-process-gone', () => {
      loading = false;
      status = 'Browser process ended unexpectedly.';
      emitState();
    });

    webContents.on('destroyed', () => {
      view = null;
      viewAttached = false;
      loading = false;
      status = 'Ready';
      emitState();
    });
  }

  async function ensureView() {
    if (view) return getViewWebContents(view);

    view = new WebContentsView({
      webPreferences: {
        partition: 'persist:Joanium-browser-preview',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false
      }
    });
    view.setBackgroundColor('#ffffff');
    view.setVisible(false);

    const webContents = getViewWebContents(view);
    if (!webContents) throw new Error('Could not create the browser preview.');
    webContents.setUserAgent(BUILTIN_BROWSER_USER_AGENT);
    wireViewEvents(webContents);
    return webContents;
  }

  async function loadUrl(input) {
    const nextUrl = normalizeUrl(input);
    const webContents = await ensureView();
    url = nextUrl;
    visible = true;
    status = `Opening ${nextUrl}`;
    attach();
    emitState();
    await webContents.loadURL(nextUrl, { userAgent: BUILTIN_BROWSER_USER_AGENT });
    return getState();
  }

  return {
    attachToWindow,
    getState,

    async loadUrl(input, ownerWindow = null) {
      if (ownerWindow) attachToWindow(ownerWindow);
      return loadUrl(input);
    },

    setHostBounds(bounds, ownerWindow = null) {
      if (ownerWindow) attachToWindow(ownerWindow);
      hostBounds = normalizeBounds(bounds);
      if (hostBounds) {
        attach();
      } else {
        detach();
      }
      emitState();
      return getState();
    },

    setVisible(nextVisible, ownerWindow = null) {
      if (ownerWindow) attachToWindow(ownerWindow);
      visible = Boolean(nextVisible);
      if (visible) attach();
      else detach();
      emitState();
      return getState();
    },

    hide() {
      visible = false;
      detach();
      emitState();
      return getState();
    },

    async goBack() {
      const webContents = getViewWebContents(view);
      if (webContents && canGoBack(webContents)) {
        if (typeof webContents.navigationHistory?.goBack === 'function') {
          webContents.navigationHistory.goBack();
        } else {
          webContents.goBack?.();
        }
      }
      return getState();
    },

    async goForward() {
      const webContents = getViewWebContents(view);
      if (webContents && canGoForward(webContents)) {
        if (typeof webContents.navigationHistory?.goForward === 'function') {
          webContents.navigationHistory.goForward();
        } else {
          webContents.goForward?.();
        }
      }
      return getState();
    },

    async reload() {
      const webContents = getViewWebContents(view);
      if (webContents && !webContents.isDestroyed()) {
        webContents.reload();
      }
      return getState();
    },

    async close() {
      visible = false;
      detach();
      const webContents = getViewWebContents(view);
      if (webContents && !webContents.isDestroyed()) {
        webContents.close();
      }
      view = null;
      title = 'Browser Preview';
      url = '';
      status = 'Ready';
      loading = false;
      emitState();
      return getState();
    }
  };
}
