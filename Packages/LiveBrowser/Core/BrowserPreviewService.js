import electron from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import strings from '../I18n/en.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { formatText } from '../../Shared/Utils/DomUtils.js';

const { BrowserWindow, WebContentsView, app } = electron;
const browserStrings = strings.browserPreview;

export const BUILTIN_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

const CHROME_CLIENT_HINTS = '"Not(A:Brand";v="99", "Google Chrome";v="134", "Chromium";v="134"';
const NAVIGATION_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';

const ERROR_MESSAGES = [
  {
    title: 'Oops! The internet took a nap.',
    sub: 'Even AI assistants need Wi-Fi. We checked — the signal is on a coffee break.',
  },
  {
    title: '404: Internet Not Found',
    sub: 'We looked everywhere. Under the desk, behind the router, inside the cloud. Nothing.',
  },
  {
    title: 'Houston, we have a problem.',
    sub: 'The network is MIA. If this were a sci-fi movie, this is the part where the music gets dramatic.',
  },
  {
    title: 'The Wi-Fi has left the chat.',
    sub: 'It said something about "needing space" and walked out. We\'re giving it a moment.',
  },
  {
    title: 'No signal? No problem.',
    sub: "Well, actually... there is a problem. A pretty big one. But we're staying positive.",
  },
  {
    title: "Connection: it's not you, it's the internet.",
    sub: 'The tubes are clogged. The packets are lost. The DNS is having an existential crisis.',
  },
  {
    title: 'The internet is playing hide and seek.',
    sub: "It's really good at this game. We've been looking for 5 minutes now.",
  },
  {
    title: "Surprise! You're offline.",
    sub: "We know, we know — in 2026 this shouldn't happen. Yet here we are.",
  },
  {
    title: 'The network pulled a vanishing act.',
    sub: 'No smoke, no mirrors — just... no internet. Presto change-o.',
  },
  {
    title: 'Looks like the cables are on strike.',
    sub: "They're demanding better bandwidth and shorter ping times. Solidarity.",
  },
  {
    title: 'Error: vibes not found.',
    sub: "The internet is having a moment. Give it a sec — it'll be back with better energy.",
  },
  {
    title: 'This page is on a digital vacation.',
    sub: 'It went to a place with no internet. Relatable, honestly.',
  },
];

function generateErrorPageHtml(errorCode = 0, errorDescription = 'Unknown', failedUrl = '') {
  const msg = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];
  const displayUrl = failedUrl && failedUrl !== 'about:blank' ? failedUrl : '';
  const displayUrlHtml = displayUrl
    ? `<div class="error-url">${displayUrl.length > 60 ? displayUrl.slice(0, 60) + '...' : displayUrl}</div>`
    : '';
  const errorCodeHtml = errorCode
    ? `<div class="error-code">Error code: ${errorCode} &middot; ${errorDescription}</div>`
    : '';
  const retryTarget = displayUrl ? displayUrl.replace(/'/g, "\\'") : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Joanium — Offline</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a0e28 0%, #160c22 50%, #1e1030 100%);
    color: #f0e8ff;
    overflow: hidden;
    position: relative;
  }

  body::before {
    content: '';
    position: absolute;
    top: -20%; left: -20%;
    width: 60%; height: 60%;
    background: radial-gradient(circle, rgba(200, 116, 217, 0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  body::after {
    content: '';
    position: absolute;
    bottom: -20%; right: -20%;
    width: 50%; height: 50%;
    background: radial-gradient(circle, rgba(180, 100, 200, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .container {
    text-align: center;
    padding: 48px 40px;
    max-width: 520px;
    position: relative;
    z-index: 1;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-12px); }
  }

  .error-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 12px;
    line-height: 1.25;
    background: linear-gradient(135deg, #f0e8ff 0%, #cc7de0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .error-sub {
    font-size: 15px;
    color: rgba(210, 185, 240, 0.72);
    line-height: 1.6;
    margin-bottom: 28px;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }

  .error-url {
    display: inline-block;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    color: rgba(204, 125, 224, 0.7);
    background: rgba(204, 125, 224, 0.08);
    border: 1px solid rgba(204, 125, 224, 0.14);
    border-radius: 10px;
    padding: 8px 16px;
    margin-bottom: 20px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .error-code {
    font-size: 11px;
    color: rgba(190, 160, 220, 0.45);
    margin-bottom: 16px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  }

  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #c874d9 0%, #a855c7 100%);
    border: none;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    box-shadow: 0 8px 28px rgba(200, 116, 217, 0.3), inset 0 1px 0 rgba(255,255,255,0.2);
    font-family: inherit;
    letter-spacing: 0.2px;
  }

  .retry-btn:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 12px 36px rgba(200, 116, 217, 0.4), inset 0 1px 0 rgba(255,255,255,0.25);
  }

  .retry-btn:active {
    transform: translateY(0) scale(0.98);
  }

  .retry-btn svg {
    width: 16px;
    height: 16px;
    transition: transform 0.3s ease;
  }

  .retry-btn:hover svg {
    transform: rotate(180deg);
  }

</style>
</head>
<body>
  <div class="container">
    <h1 class="error-title">${msg.title}</h1>
    <p class="error-sub">${msg.sub}</p>
    ${displayUrlHtml}
    ${errorCodeHtml}
    <button class="retry-btn" onclick="${retryTarget ? `window.location.href='${retryTarget}'` : 'window.location.reload()'}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      Try Again
    </button>
  </div>
</body>
</html>`;
}

export const LIVE_BROWSER_TOOL_NAMES = Object.freeze([
  'browser_navigate',
  'browser_get_state',
  'browser_snapshot',
  'browser_get_text',
  'browser_click',
  'browser_type',
  'browser_press_key',
  'browser_scroll',
  'browser_back',
  'browser_forward',
  'browser_refresh',
  'browser_screenshot',
]);

const PAGE_HELPERS = `
function cleanText(value) {
  return String(value ?? '').replace(/\\s+/g, ' ').trim();
}

function isVisible(element) {
  if (!element || !(element instanceof Element)) return false;
  const style = getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.right >= 0
    && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

function getElementLabel(element) {
  if (!element) return '';
  const aria = element.getAttribute?.('aria-label') || element.getAttribute?.('placeholder') || element.getAttribute?.('title');
  const ownText = cleanText(element.innerText || element.textContent || element.value || '');
  const id = element.id ? cleanText(element.id) : '';
  const name = element.getAttribute?.('name') ? cleanText(element.getAttribute('name')) : '';
  const labelledBy = element.getAttribute?.('aria-labelledby');
  const labelledText = labelledBy
    ? cleanText(labelledBy.split(/\\s+/).map((idValue) => document.getElementById(idValue)?.innerText || '').join(' '))
    : '';
  const label = element.id ? cleanText(document.querySelector('label[for="' + CSS.escape(element.id) + '"]')?.innerText || '') : '';
  return cleanText([aria, labelledText, label, ownText, name, id].filter(Boolean).join(' '));
}

function getRole(element) {
  if (!element) return 'element';
  const explicit = element.getAttribute?.('role');
  if (explicit) return explicit;
  const tag = element.tagName.toLowerCase();
  if (tag === 'a') return 'link';
  if (tag === 'button') return 'button';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'select') return 'select';
  if (tag === 'input') {
    const type = String(element.type || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'submit' || type === 'button') return 'button';
    return 'textbox';
  }
  if (element.isContentEditable) return 'textbox';
  return tag;
}

function collectInteractive(root = document) {
  const selector = [
    'a[href]',
    'button',
    'input',
    'textarea',
    'select',
    'summary',
    '[role]',
    '[contenteditable="true"]'
  ].join(',');
  return [...root.querySelectorAll(selector)].filter(isVisible);
}

function resolveTarget(target, options = {}) {
  const query = cleanText(target);
  if (!query) return null;
  if (query === 'focused') return document.activeElement;
  if (window.__joaniumBrowserTargets?.[query] && document.contains(window.__joaniumBrowserTargets[query])) {
    return window.__joaniumBrowserTargets[query];
  }
  try {
    const selectorMatch = document.querySelector(query);
    if (selectorMatch) return selectorMatch;
  } catch {}

  const lowerQuery = query.toLowerCase();
  const candidates = options.preferTextField
    ? collectInteractive().filter((element) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable)
    : collectInteractive();

  return candidates.find((element) => getElementLabel(element).toLowerCase().includes(lowerQuery)) ?? null;
}

function setElementValue(element, value) {
  if (!element) return false;
  const nextValue = String(value ?? '');
  element.focus?.();
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = nextValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (element instanceof HTMLSelectElement) {
    const requested = nextValue.toLowerCase();
    const option = [...element.options].find((item) =>
      String(item.value).toLowerCase() === requested || cleanText(item.textContent).toLowerCase() === requested
    );
    if (!option) return false;
    element.value = option.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (element.isContentEditable) {
    element.textContent = nextValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}
`;

function normalizeUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error(browserStrings.errors.urlRequired);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.startsWith('file://')) return raw;
  return `https://${raw}`;
}

function getRegistrableDomain(hostname = '') {
  const parts = String(hostname).split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const tld = parts.at(-1);
  const sld = parts.at(-2);
  const thirdLevel = parts.at(-3);
  return tld.length === 2 && ['co', 'com', 'net', 'org', 'gov', 'edu', 'ac'].includes(sld)
    ? `${thirdLevel}.${sld}.${tld}`
    : `${sld}.${tld}`;
}

function getFetchSite(url = '', initiator = '') {
  try {
    if (!initiator || initiator === 'null') return 'none';
    const target = new URL(url);
    const source = new URL(initiator);
    if (target.origin === source.origin) return 'same-origin';
    return getRegistrableDomain(target.hostname) === getRegistrableDomain(source.hostname)
      ? 'same-site'
      : 'cross-site';
  } catch {
    // initiator is guaranteed non-empty here: the early guard above already
    // returns 'none' for any falsy value or the string 'null'.
    return 'cross-site';
  }
}

function buildExtraHeaders(url, referrer = '') {
  const fetchSite = referrer ? getFetchSite(url, referrer) : 'none';
  return `${[
    `Accept: ${NAVIGATION_ACCEPT}`,
    'Accept-Language: en-IN,en-US;q=0.9,en;q=0.8',
    'Cache-Control: max-age=0',
    'Pragma: no-cache',
    'Upgrade-Insecure-Requests: 1',
    `Sec-CH-UA: ${CHROME_CLIENT_HINTS}`,
    'Sec-CH-UA-Mobile: ?0',
    'Sec-CH-UA-Platform: "Windows"',
    'Sec-Fetch-Dest: document',
    'Sec-Fetch-Mode: navigate',
    `Sec-Fetch-Site: ${fetchSite}`,
    'Sec-Fetch-User: ?1',
  ].join('\n')}\n`;
}

function buildRequestHeaders(details) {
  const headers = { ...(details.requestHeaders ?? {}) };
  const resourceType = details.resourceType ?? '';
  const referrer =
    headers.Referer || headers.referer || details.referrer || details.initiator || '';

  headers['User-Agent'] = BUILTIN_BROWSER_USER_AGENT;
  headers.Accept =
    headers.Accept ||
    headers.accept ||
    (['mainFrame', 'subFrame'].includes(resourceType) ? NAVIGATION_ACCEPT : '*/*');
  headers['Accept-Language'] =
    headers['Accept-Language'] || headers['accept-language'] || 'en-IN,en-US;q=0.9,en;q=0.8';
  headers['Sec-CH-UA'] = headers['Sec-CH-UA'] || CHROME_CLIENT_HINTS;
  headers['Sec-CH-UA-Mobile'] = headers['Sec-CH-UA-Mobile'] || '?0';
  headers['Sec-CH-UA-Platform'] = headers['Sec-CH-UA-Platform'] || '"Windows"';
  headers['Sec-Fetch-Site'] = headers['Sec-Fetch-Site'] || getFetchSite(details.url, referrer);

  if (['mainFrame', 'subFrame'].includes(resourceType)) {
    headers['Cache-Control'] = headers['Cache-Control'] || 'max-age=0';
    headers.Pragma = headers.Pragma || 'no-cache';
    headers['Upgrade-Insecure-Requests'] = headers['Upgrade-Insecure-Requests'] || '1';
    headers['Sec-Fetch-Dest'] =
      headers['Sec-Fetch-Dest'] || (resourceType === 'mainFrame' ? 'document' : 'iframe');
    headers['Sec-Fetch-Mode'] = headers['Sec-Fetch-Mode'] || 'navigate';
    headers['Sec-Fetch-User'] = headers['Sec-Fetch-User'] || '?1';
  }

  delete headers.accept;
  delete headers['accept-language'];
  delete headers.referer;
  if (referrer && !headers.Referer) headers.Referer = referrer;
  return headers;
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
    height: Math.max(1, height),
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

function formatBrowserState(state) {
  return [
    `${browserStrings.stateLabels.title}: ${state.title || browserStrings.fallbackTitle}`,
    `${browserStrings.stateLabels.url}: ${state.url || browserStrings.noPageLoaded}`,
    `${browserStrings.stateLabels.visible}: ${
      state.visible ? browserStrings.yes : browserStrings.no
    }`,
    `${browserStrings.stateLabels.loading}: ${
      state.loading ? browserStrings.yes : browserStrings.no
    }`,
    `${browserStrings.stateLabels.status}: ${state.status || browserStrings.status.ready}`,
  ].join('\n');
}

function safeScreenshotName(fileName = '') {
  const rawName =
    String(fileName ?? '').trim() ||
    `browser-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  const withExtension = rawName.toLowerCase().endsWith('.png') ? rawName : `${rawName}.png`;
  return withExtension.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
}

export function createBrowserPreviewService({ rootDirectory } = {}) {
  let windowRef = null;
  let view = null;
  let viewAttached = false;
  let visible = false;
  let hostBounds = null;
  let paused = false;
  let title = browserStrings.fallbackTitle;
  let url = '';
  let status = browserStrings.status.ready;
  let loading = false;
  let resizeHandler = null;
  let sessionConfigured = false;
  let browsingHistory = null;
  let pendingHistoryWho = 'ai';
  let skipNextHistory = false;

  function getHistoryPath() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return path.join(
      rootDirectory ? getWritableDataDirectory(rootDirectory) : app.getPath('userData'),
      'Browsing',
      year,
      month,
      `${day}.json`,
    );
  }

  async function ensureHistoryLoaded() {
    if (browsingHistory !== null) return;
    try {
      const filePath = getHistoryPath();
      const raw = await readFile(filePath, 'utf8');
      browsingHistory = JSON.parse(raw);
    } catch {
      browsingHistory = [];
    }
  }

  async function saveHistoryToDisk() {
    if (browsingHistory === null) return;
    const filePath = getHistoryPath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(browsingHistory, null, 2), 'utf8');
  }

  function recordHistory(url, title, who = 'user') {
    if (skipNextHistory) {
      skipNextHistory = false;
      return;
    }
    if (browsingHistory === null) {
      browsingHistory = [];
    }
    const last = browsingHistory[browsingHistory.length - 1];
    if (last && last.url === url) return;
    browsingHistory.push({ url, title: title || url, timestamp: Date.now(), who });
    saveHistoryToDisk().catch(() => {});
  }

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
      height: Math.max(320, height - y - 32),
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
      canGoForward: canGoForward(webContents),
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
    if (!visible || !view || paused) return;
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
      title = nextTitle || browserStrings.fallbackTitle;
      emitState();
    });

    webContents.on('did-start-loading', () => {
      loading = true;
      status = browserStrings.status.loading;
      emitState();
    });

    webContents.on('did-stop-loading', () => {
      loading = false;
      title = webContents.getTitle() || title;
      url = webContents.getURL() || url;
      status = browserStrings.status.ready;
      emitState();
    });

    webContents.on('did-navigate', (_event, nextUrl) => {
      url = nextUrl || url;
      recordHistory(url, title, pendingHistoryWho);
      emitState();
    });

    webContents.on('did-navigate-in-page', (_event, nextUrl) => {
      url = nextUrl || url;
      emitState();
    });

    webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
        if (!isMainFrame) return;
        loading = false;
        url = validatedUrl || url;
        status = formatText(browserStrings.status.loadFailed, {
          code: errorCode,
          description: errorDescription,
        });
        emitState();
        view.setBackgroundColor('#1a0e28');
        const errorHtml = generateErrorPageHtml(errorCode, errorDescription, validatedUrl);
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`;
        webContents.loadURL(dataUrl).catch(() => {});
      },
    );

    webContents.on('render-process-gone', () => {
      loading = false;
      status = browserStrings.status.processEnded;
      emitState();
    });

    webContents.on('unresponsive', () => {
      loading = false;
      status = 'Page is not responding';
      emitState();
    });

    webContents.on('destroyed', () => {
      view = null;
      viewAttached = false;
      loading = false;
      status = browserStrings.status.ready;
      emitState();
    });
  }

  function configureSession(session) {
    if (!session || sessionConfigured) return;
    session.webRequest.onBeforeSendHeaders((details, callback) => {
      callback({ requestHeaders: buildRequestHeaders(details) });
    });
    sessionConfigured = true;
  }

  async function ensureView() {
    if (view) return getViewWebContents(view);

    view = new WebContentsView({
      webPreferences: {
        partition: 'persist:Joanium-browser-preview',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    view.setBackgroundColor('#ffffff');
    view.setVisible(false);

    const webContents = getViewWebContents(view);
    if (!webContents) throw new Error(browserStrings.errors.createPreviewFailed);
    configureSession(webContents.session);
    webContents.setUserAgent(BUILTIN_BROWSER_USER_AGENT);
    wireViewEvents(webContents);
    return webContents;
  }

  async function loadUrl(input, { referrer = '', who = 'ai', skipHistory = false } = {}) {
    const nextUrl = normalizeUrl(input);
    pendingHistoryWho = who;
    if (skipHistory) skipNextHistory = true;
    const webContents = await ensureView();
    url = nextUrl;
    visible = true;
    status = formatText(browserStrings.status.opening, { url: nextUrl });
    attach();
    emitState();
    await webContents.loadURL(nextUrl, {
      userAgent: BUILTIN_BROWSER_USER_AGENT,
      extraHeaders: buildExtraHeaders(nextUrl, referrer),
      ...(referrer ? { httpReferrer: referrer } : {}),
    });
    return getState();
  }

  async function getPageWebContents(ownerWindow = null) {
    if (ownerWindow) attachToWindow(ownerWindow);
    if (!view || !url) {
      throw new Error(browserStrings.errors.pageRequired);
    }
    const webContents = getViewWebContents(view);
    if (!webContents || webContents.isDestroyed()) {
      throw new Error(browserStrings.errors.pageUnavailable);
    }
    return webContents;
  }

  async function executeOnPage(script, ownerWindow = null) {
    const webContents = await getPageWebContents(ownerWindow);
    return webContents.executeJavaScript(script, false);
  }

  async function browserSnapshot(ownerWindow = null) {
    const result = await executeOnPage(
      `
      (() => {
        ${PAGE_HELPERS}
        window.__joaniumBrowserTargets = {};
        const elements = collectInteractive().slice(0, 80).map((element, index) => {
          const id = 'ow-' + (index + 1);
          window.__joaniumBrowserTargets[id] = element;
          const rect = element.getBoundingClientRect();
          return {
            id,
            role: getRole(element),
            label: getElementLabel(element).slice(0, 140),
            tag: element.tagName.toLowerCase(),
            href: element.href || '',
            value: element.value || '',
            checked: typeof element.checked === 'boolean' ? element.checked : null,
            disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true'),
            bounds: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
        });
        return {
          title: document.title,
          url: location.href,
          text: cleanText(document.body?.innerText || '').slice(0, 1800),
          elements
        };
      })()
    `,
      ownerWindow,
    );

    const lines = [
      formatText(browserStrings.messages.page, { title: result.title || browserStrings.untitled }),
      `${browserStrings.stateLabels.url}: ${result.url || url}`,
      '',
      browserStrings.messages.visibleElements,
    ];

    if (result.elements?.length) {
      for (const element of result.elements) {
        const label = element.label || element.href || element.tag;
        const state = element.disabled ? browserStrings.messages.disabledState : '';
        lines.push(
          formatText(browserStrings.messages.elementLine, {
            id: element.id,
            role: element.role,
            label,
            state,
          }),
        );
      }
    } else {
      lines.push(browserStrings.noneVisible);
    }

    if (result.text) {
      lines.push('', browserStrings.messages.pageTextExcerpt, result.text);
    }

    return lines.join('\n');
  }

  async function browserGetText(params = {}, ownerWindow = null) {
    const target = String(params.target ?? '').trim();
    const result = await executeOnPage(
      `
      (() => {
        ${PAGE_HELPERS}
        const target = ${JSON.stringify(target)};
        const element = target ? resolveTarget(target) : document.body;
        if (!element) return { ok: false, error: ${JSON.stringify(
          browserStrings.errors.elementNotFound,
        )} };
        return { ok: true, text: cleanText(element.innerText || element.textContent || element.value || '') };
      })()
    `,
      ownerWindow,
    );
    if (!result?.ok) throw new Error(result?.error ?? browserStrings.errors.readTextFailed);
    return result.text || browserStrings.noVisibleText;
  }

  async function browserClick(params = {}, ownerWindow = null) {
    const target = String(params.target ?? '').trim();
    if (!target) throw new Error(browserStrings.errors.targetRequired);
    const result = await executeOnPage(
      `
      (() => {
        ${PAGE_HELPERS}
        const element = resolveTarget(${JSON.stringify(target)});
        if (!element) return { ok: false, error: ${JSON.stringify(
          browserStrings.errors.elementNotFound,
        )} };
        element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        element.focus?.();
        element.click();
        return { ok: true, label: getElementLabel(element), role: getRole(element) };
      })()
    `,
      ownerWindow,
    );
    if (!result?.ok) throw new Error(result?.error ?? browserStrings.errors.clickFailed);
    return formatText(browserStrings.messages.clicked, {
      role: result.role || browserStrings.elementFallback,
      label: result.label || target,
    });
  }

  async function browserType(params = {}, ownerWindow = null) {
    const target = String(params.target ?? '').trim();
    const text = String(params.text ?? '');
    if (!target) throw new Error(browserStrings.errors.targetRequired);
    const result = await executeOnPage(
      `
      (() => {
        ${PAGE_HELPERS}
        const element = resolveTarget(${JSON.stringify(target)}, { preferTextField: true });
        if (!element) return { ok: false, error: ${JSON.stringify(
          browserStrings.errors.textFieldNotFound,
        )} };
        const clearFirst = ${params.clear_first === false || params.clearFirst === false ? 'false' : 'true'};
        const nextText = ${JSON.stringify(text)};
        const current = clearFirst ? '' : String(element.value || element.textContent || '');
        if (!setElementValue(element, current + nextText)) return { ok: false, error: ${JSON.stringify(
          browserStrings.errors.elementCannotReceiveText,
        )} };
        if (${params.press_enter === true || params.pressEnter === true ? 'true' : 'false'}) {
          element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
          if (element.form) element.form.requestSubmit?.();
        }
        return { ok: true, label: getElementLabel(element) };
      })()
    `,
      ownerWindow,
    );
    if (!result?.ok) throw new Error(result?.error ?? browserStrings.errors.typingFailed);
    return formatText(browserStrings.messages.typed, { label: result.label || target });
  }

  async function browserPressKey(params = {}, ownerWindow = null) {
    const key = String(params.key ?? '').trim();
    if (!key) throw new Error(browserStrings.errors.keyRequired);

    if (params.target) {
      await executeOnPage(
        `
        (() => {
          ${PAGE_HELPERS}
          const element = resolveTarget(${JSON.stringify(params.target)});
          if (element) element.focus?.();
        })()
      `,
        ownerWindow,
      );
    }

    const webContents = await getPageWebContents(ownerWindow);
    webContents.sendInputEvent({ type: 'keyDown', keyCode: key });
    webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
    return formatText(browserStrings.messages.pressedKey, { key });
  }

  async function browserScroll(params = {}, ownerWindow = null) {
    const direction = String(params.direction ?? 'down')
      .trim()
      .toLowerCase();
    const amount = Math.min(Math.max(Number(params.amount) || 600, 1), 5000);
    const target = String(params.target ?? '').trim();
    const result = await executeOnPage(
      `
      (() => {
        ${PAGE_HELPERS}
        const target = ${JSON.stringify(target)};
        const direction = ${JSON.stringify(direction)};
        const amount = ${JSON.stringify(amount)};
        const element = target ? resolveTarget(target) : null;
        const scroller = element || document.scrollingElement || document.documentElement;
        if (!scroller) return { ok: false, error: ${JSON.stringify(
          browserStrings.errors.noScrollTarget,
        )} };
        if (direction === 'top') scroller.scrollTo?.({ top: 0, behavior: 'instant' });
        else if (direction === 'bottom') scroller.scrollTo?.({ top: scroller.scrollHeight, behavior: 'instant' });
        else scroller.scrollBy?.({
          top: direction === 'up' ? -amount : direction === 'down' ? amount : 0,
          left: direction === 'left' ? -amount : direction === 'right' ? amount : 0,
          behavior: 'instant'
        });
        return { ok: true, direction, amount };
      })()
    `,
      ownerWindow,
    );
    if (!result?.ok) throw new Error(result?.error ?? browserStrings.errors.scrollFailed);
    const amountText = ['top', 'bottom'].includes(direction)
      ? ''
      : formatText(browserStrings.messages.scrollAmount, { amount });
    return formatText(browserStrings.messages.scrolled, { direction, amount: amountText });
  }

  async function browserScreenshot(params = {}, ownerWindow = null) {
    const webContents = await getPageWebContents(ownerWindow);
    const image = await webContents.capturePage();
    const directory = path.join(
      rootDirectory ? getWritableDataDirectory(rootDirectory) : app.getPath('userData'),
      'Screenshots',
    );
    await mkdir(directory, { recursive: true });
    const filePath = path.join(directory, safeScreenshotName(params.file_name ?? params.fileName));
    await writeFile(filePath, image.toPNG());
    return formatText(browserStrings.messages.screenshotSaved, { path: filePath });
  }

  async function goBack() {
    const webContents = getViewWebContents(view);
    if (webContents && canGoBack(webContents)) {
      if (typeof webContents.navigationHistory?.goBack === 'function') {
        webContents.navigationHistory.goBack();
      } else {
        webContents.goBack?.();
      }
    }
    return getState();
  }

  async function goForward() {
    const webContents = getViewWebContents(view);
    if (webContents && canGoForward(webContents)) {
      if (typeof webContents.navigationHistory?.goForward === 'function') {
        webContents.navigationHistory.goForward();
      } else {
        webContents.goForward?.();
      }
    }
    return getState();
  }

  async function reload() {
    const webContents = getViewWebContents(view);
    if (webContents && !webContents.isDestroyed()) {
      webContents.reload();
    }
    return getState();
  }

  async function executeTool(tool, params = {}, context = {}) {
    const ownerWindow = context.ownerWindow ?? null;
    if (ownerWindow) attachToWindow(ownerWindow);

    switch (tool) {
      case 'browser_navigate': {
        const rawUrl = params.url ?? params.URL ?? params.href ?? '';
        const state = await loadUrl(rawUrl, { referrer: url });
        return (
          formatText(browserStrings.messages.opened, { url: state.url }) +
          '\nPage is now loaded. Call browser_snapshot to see interactive elements or browser_get_text to read the page content.'
        );
      }
      case 'browser_get_state':
        return formatBrowserState(getState());
      case 'browser_snapshot':
        return browserSnapshot(ownerWindow);
      case 'browser_get_text':
        return browserGetText(params, ownerWindow);
      case 'browser_click':
        return browserClick(params, ownerWindow);
      case 'browser_type':
        return browserType(params, ownerWindow);
      case 'browser_press_key':
        return browserPressKey(params, ownerWindow);
      case 'browser_scroll':
        return browserScroll(params, ownerWindow);
      case 'browser_back':
        await goBack();
        return formatBrowserState(getState());
      case 'browser_forward':
        await goForward();
        return formatBrowserState(getState());
      case 'browser_refresh':
        await reload();
        return formatBrowserState(getState());
      case 'browser_screenshot':
        return browserScreenshot(params, ownerWindow);
      default:
        throw new Error(browserStrings.errors.unsupportedTool);
    }
  }

  return {
    attachToWindow,
    getState,
    executeTool,

    async loadUrl(input, { ownerWindow = null, who = 'ai', skipHistory = false } = {}) {
      if (ownerWindow) attachToWindow(ownerWindow);
      return loadUrl(input, { who, skipHistory });
    },

    async loadHtml(html, { ownerWindow = null, who = 'ai' } = {}) {
      if (ownerWindow) attachToWindow(ownerWindow);
      pendingHistoryWho = who;
      const webContents = await ensureView();
      url = 'about:blank';
      visible = true;
      status = 'Previewing HTML';
      attach();
      emitState();
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await webContents.loadURL(dataUrl, {
        userAgent: BUILTIN_BROWSER_USER_AGENT,
      });
      return getState();
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

    // Temporarily hide the native view for the history overlay.
    // Saves the current bounds so we can restore them without losing position.
    // Does NOT change `visible` or emit state to the renderer.
    pauseHistoryView() {
      if (!view) return;
      view.setVisible(false);
      if (viewAttached && windowRef && !windowRef.isDestroyed()) {
        windowRef.contentView.removeChildView(view);
        viewAttached = false;
      }
    },

    // Restore the native view after the history overlay is closed.
    resumeHistoryView() {
      if (!view || !visible) return;
      attach();
    },

    // Called by the Shell when the user leaves the chat panel.
    // The WebContentsView is removed from the compositor so it stops painting,
    // but the WebContents stays alive — the AI can still read and interact with
    // the page. attach() becomes a no-op until resume() is called.
    pauseView() {
      paused = true;
      detach();
      emitState();
    },

    // Called by the Shell when the user returns to the chat panel.
    // Clears the paused flag and re-syncs bounds so the view reappears.
    resumeView() {
      paused = false;
      if (visible) attach();
      emitState();
    },

    goBack,

    goForward,

    reload,

    async getHistory() {
      await ensureHistoryLoaded();
      return browsingHistory ?? [];
    },

    async clearHistory() {
      browsingHistory = [];
      await saveHistoryToDisk();
    },

    async deleteHistoryEntry(timestamp) {
      await ensureHistoryLoaded();
      if (!browsingHistory) return;
      browsingHistory = browsingHistory.filter((e) => e.timestamp !== timestamp);
      await saveHistoryToDisk();
    },

    async close() {
      visible = false;
      detach();

      // Tear down the resize listener so nothing holds a reference to the old view.
      if (resizeHandler && windowRef && !windowRef.isDestroyed()) {
        windowRef.off('resize', resizeHandler);
      }
      resizeHandler = null;

      const webContents = getViewWebContents(view);
      if (webContents && !webContents.isDestroyed()) {
        // destroy() immediately kills the renderer process and frees GPU/RAM.
        // close() alone is only a graceful signal and leaves the process alive.
        webContents.destroy();
      }
      view = null;
      title = browserStrings.fallbackTitle;
      url = '';
      status = browserStrings.status.ready;
      loading = false;
      sessionConfigured = false;
      emitState();
      return getState();
    },
  };
}
