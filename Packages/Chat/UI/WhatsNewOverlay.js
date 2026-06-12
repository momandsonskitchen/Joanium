import { createElement } from '../../Shared/Utils/DomUtils.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';

/**
 * Creates the "What's New" overlay shown once after an app update.
 *
 * @param {object}   options
 * @param {object}   options.strings    – I18n strings (chat namespace)
 * @param {string}   options.version    – App version to display
 * @param {string}   options.imagePath  – URL for the portrait image on the right
 * @param {string[]} options.entries    – Changelog bullet points for this version
 * @param {Function} options.onDismiss  – () => void
 * @returns {HTMLElement}
 */
export function createWhatsNewOverlay({ strings, version, imagePath, entries, onDismiss }) {
  const overlay = createElement('div', 'whats-new-overlay');

  const backdrop = createElement('div', 'whats-new-overlay__backdrop');
  backdrop.addEventListener('click', dismiss);

  const card = createElement('div', 'whats-new-overlay__card');

  // ── Close button ──────────────────────────────────────────────────────
  const closeBtn = createElement('button', 'whats-new-overlay__close');
  closeBtn.type = 'button';
  closeBtn.append(createIcon('close', 'whats-new-overlay__close-icon'));
  closeBtn.addEventListener('click', dismiss);
  card.append(closeBtn);

  // ── Left content section ──────────────────────────────────────────────
  const leftWrapper = createElement('div', 'whats-new-overlay__left-wrapper');
  const left = createElement('div', 'whats-new-overlay__left');

  const badge = createElement('span', 'whats-new-overlay__badge', strings.whatsNew?.badge ?? 'New');
  left.append(badge);

  const heading = createElement(
    'h2',
    'whats-new-overlay__heading',
    strings.whatsNew?.heading ?? "What's New",
  );
  left.append(heading);

  const versionEl = createElement('p', 'whats-new-overlay__version', `v${version}`);
  left.append(versionEl);

  // ── Changelog entries ─────────────────────────────────────────────────
  if (Array.isArray(entries) && entries.length > 0) {
    const list = createElement('ul', 'whats-new-overlay__entries');
    for (const entry of entries) {
      const li = document.createElement('li');
      li.className = 'whats-new-overlay__entry';
      li.textContent = entry;
      list.append(li);
    }
    left.append(list);
  }

  leftWrapper.append(left);

  // ── Custom Scrollbar ──────────────────────────────────────────────────
  const scrollbar = attachCustomScrollbar(leftWrapper, left, {
    top: 36,
    bottom: 32,
    right: 8,
    minThumb: 40,
  });

  // ── Right image section ───────────────────────────────────────────────
  const right = createElement('div', 'whats-new-overlay__right');

  if (imagePath) {
    const img = document.createElement('img');
    img.className = 'whats-new-overlay__image';
    img.src = imagePath;
    img.alt = '';
    img.draggable = false;
    right.append(img);
  }

  card.append(leftWrapper, right);
  overlay.append(backdrop, card);

  // ── Animate in ────────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('whats-new-overlay--visible');
    });
  });

  // ── Escape key to close ───────────────────────────────────────────────
  function onKeyDown(event) {
    if (event.key === 'Escape') dismiss();
  }
  document.addEventListener('keydown', onKeyDown);

  function dismiss() {
    scrollbar.dispose();
    overlay.classList.remove('whats-new-overlay--visible');
    document.removeEventListener('keydown', onKeyDown);
    overlay.addEventListener(
      'transitionend',
      () => {
        overlay.remove();
      },
      { once: true },
    );
    // Fallback in case transitionend never fires
    setTimeout(() => {
      if (overlay.isConnected) overlay.remove();
    }, 400);
    onDismiss?.();
  }

  return overlay;
}
