import electron from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import strings from '../I18n/en.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

const { BrowserWindow, WebContentsView } = electron;
const browserStrings = strings.browserPreview;

export const BUILTIN_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

const CHROME_CLIENT_HINTS = '"Not(A:Brand";v="99", "Google Chrome";v="134", "Chromium";v="134"';
const NAVIGATION_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';

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

function formatText(template, replacements = {}) {
  return String(template).replace(/\{([^}]+)\}/g, (_, key) => replacements[key] ?? '');
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
    return initiator ? 'cross-site' : 'none';
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
      },
    );

    webContents.on('render-process-gone', () => {
      loading = false;
      status = browserStrings.status.processEnded;
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

  async function loadUrl(input, { referrer = '' } = {}) {
    const nextUrl = normalizeUrl(input);
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
      rootDirectory ? getWritableDataDirectory(rootDirectory) : os.tmpdir(),
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
