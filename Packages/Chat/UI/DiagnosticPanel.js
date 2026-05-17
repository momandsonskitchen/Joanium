import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';

// Connection diagnostic — shown after 10 s of waiting for a response.
// Reuses the streaming assistant message's existing thinking block rather than
// creating a separate panel. The block label is temporarily switched to
// "Status" and diagnostic items are injected into its body. When real thinking
// content arrives the block silently reverts to normal reasoning display.
// ---------------------------------------------------------------------------

const DIAG_ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12"/></svg>`;
const DIAG_ICON_WARN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const DIAG_ICON_SPIN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;

function diagIconClass(tone) {
  if (tone === 'spin') return 'chat-diag__icon chat-diag__icon--spin';
  if (tone === 'warn') return 'chat-diag__icon chat-diag__icon--warn';
  if (tone === 'error') return 'chat-diag__icon chat-diag__icon--error';
  return 'chat-diag__icon';
}

function diagIconSvg(tone) {
  if (tone === 'spin') return DIAG_ICON_SPIN;
  if (tone === 'warn' || tone === 'error') return DIAG_ICON_WARN;
  return DIAG_ICON_CHECK;
}

// Takes `strings` so it can read diag.statusLabel and composer.reasoning.
export function createDiagnosticPanel(strings) {
  let activeWrap = null;
  let itemsContainer = null;

  function addItem(text, tone = 'ok') {
    if (!itemsContainer) return { update() {} };
    const item = createElement('div', 'chat-diag__item');
    const iconEl = createElement('span', diagIconClass(tone));
    iconEl.innerHTML = diagIconSvg(tone);
    const textEl = createElement('span', 'chat-diag__text', text);
    item.append(iconEl, textEl);
    itemsContainer.append(item);
    activeWrap?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return {
      update(nextText, nextTone = 'ok') {
        iconEl.className = diagIconClass(nextTone);
        iconEl.innerHTML = diagIconSvg(nextTone);
        textEl.textContent = nextText;
      },
    };
  }

  function show(threadEl) {
    // Find the last thinking block inside the last streaming assistant message.
    const allWraps = threadEl?.querySelectorAll('.chat-message__thinking');
    const wrap = allWraps?.length ? allWraps[allWraps.length - 1] : null;
    if (!wrap) return;

    activeWrap = wrap;
    const label = wrap.querySelector('.chat-message__thinking-label');
    const body = wrap.querySelector('.chat-message__thinking-body');
    if (!body) return;

    // Save the original label text so we can restore it if real thinking arrives.
    if (label) {
      label.__originalText = label.textContent;
      label.textContent = strings.diag.statusLabel;
    }

    // Mark status mode so updateLastStreamingMessage knows to exit gracefully.
    wrap.__statusMode = true;
    wrap.hidden = false;
    wrap.open = true;

    // Replace the thinking body with a fresh items container.
    itemsContainer = createElement('div', 'chat-diag');
    body.replaceChildren(itemsContainer);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        itemsContainer?.classList.add('chat-diag--visible');
        wrap.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }),
    );
  }

  function hide() {
    if (!activeWrap) return;

    const label = activeWrap.querySelector('.chat-message__thinking-label');
    const body = activeWrap.querySelector('.chat-message__thinking-body');

    // Restore original label.
    if (label?.__originalText) {
      label.textContent = label.__originalText;
      delete label.__originalText;
    }

    // Exit status mode and collapse the block.
    delete activeWrap.__statusMode;
    activeWrap.open = false;
    activeWrap.hidden = true;
    if (body) body.replaceChildren(createElement('p', 'chat-message__thinking-text', ''));

    activeWrap = null;
    itemsContainer = null;
  }

  return { addItem, show, hide };
}

// Probe a URL and return { ok, ms }. Uses no-cors so the host just needs to
// be reachable; we don't need to read the response body.
export async function measureFetch(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    await fetch(url, { signal: controller.signal, mode: 'no-cors', cache: 'no-store' });
    return { ok: true, ms: Date.now() - t0 };
  } catch {
    return { ok: false, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

// Extract just the protocol + host from a provider endpoint string so we can
// do a lightweight reachability probe without needing auth.
export function resolveProviderBaseUrl(provider, userProviderDetails) {
  const details = userProviderDetails?.[provider.id] ?? {};
  const endpoint =
    collapseWhitespace(details.endpoint) || collapseWhitespace(provider.endpoint) || '';
  if (!endpoint) return null;
  try {
    const url = new URL(endpoint.replace('{model}', 'probe'));
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}
