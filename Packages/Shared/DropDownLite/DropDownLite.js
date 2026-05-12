import { createElement } from '../Utils/DomUtils.js';

// ── createDropDownLite ─────────────────────────────────────────────────────
// A compact, inline-friendly dropdown built for settings panels and tight
// layouts. The option panel is portalled to document.body so it is never
// clipped by ancestor overflow or stacking contexts.
//
// Options shape: [{ value: string, label: string }]
//
// Returns: { element, getValue(), setValue(value), dispose() }

export function createDropDownLite({
  label = '',
  options = [],
  value = '',
  placeholder = 'Select',
  onChange,
} = {}) {
  let currentValue = value;

  // ── Wrapper ──────────────────────────────────────────────────────────────

  const wrapper = createElement('div', 'joanium-ddm-lite');

  if (label) {
    wrapper.append(createElement('span', 'joanium-ddm-lite__label', label));
  }

  // ── Trigger ──────────────────────────────────────────────────────────────

  const trigger = createElement('button', 'joanium-ddm-lite__trigger');
  trigger.type = 'button';
  const triggerText = createElement('span', 'joanium-ddm-lite__trigger-text');

  const chevronSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevronSvg.setAttribute('class', 'joanium-ddm-lite__chevron');
  chevronSvg.setAttribute('viewBox', '0 0 16 16');
  chevronSvg.setAttribute('fill', 'none');
  chevronSvg.setAttribute('aria-hidden', 'true');
  const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  chevronPath.setAttribute('d', 'M3 5.5L8 10.5L13 5.5');
  chevronPath.setAttribute('stroke', 'currentColor');
  chevronPath.setAttribute('stroke-width', '1.75');
  chevronPath.setAttribute('stroke-linecap', 'round');
  chevronPath.setAttribute('stroke-linejoin', 'round');
  chevronSvg.append(chevronPath);

  trigger.append(triggerText, chevronSvg);
  wrapper.append(trigger);

  // ── Panel (portalled to body) ─────────────────────────────────────────────

  const panel = createElement('div', 'joanium-ddm-lite__panel');
  panel.setAttribute('role', 'listbox');
  document.body.append(panel);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function syncTriggerText() {
    const match = options.find((o) => o.value === currentValue);
    if (match) {
      triggerText.textContent = match.label;
      triggerText.classList.remove('joanium-ddm-lite__trigger-text--placeholder');
    } else {
      triggerText.textContent = placeholder;
      triggerText.classList.add('joanium-ddm-lite__trigger-text--placeholder');
    }
  }

  function buildPanel() {
    panel.replaceChildren();
    for (const opt of options) {
      const item = createElement('button', 'joanium-ddm-lite__option');
      item.type = 'button';
      item.setAttribute('role', 'option');
      item.textContent = opt.label;
      item.classList.toggle('is-selected', opt.value === currentValue);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        currentValue = opt.value;
        syncTriggerText();
        buildPanel();
        close();
        onChange?.(opt.value);
      });

      panel.append(item);
    }
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    const panelH = Math.min(options.length * 38 + 16, 240);
    const goUp =
      window.innerHeight - rect.bottom < panelH && rect.top > window.innerHeight - rect.bottom;

    panel.style.left = `${rect.left}px`;
    panel.style.width = `${rect.width}px`;

    if (goUp) {
      panel.style.top = 'auto';
      panel.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    } else {
      panel.style.bottom = 'auto';
      panel.style.top = `${rect.bottom + 6}px`;
    }
  }

  function open() {
    positionPanel();
    wrapper.classList.add('is-open');
    panel.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function close() {
    wrapper.classList.remove('is-open');
    panel.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  // ── Document-level listeners ──────────────────────────────────────────────

  function onDocClick(e) {
    if (!wrapper.contains(e.target) && !panel.contains(e.target)) close();
  }

  function onDocKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function onScrollOrResize() {
    if (wrapper.classList.contains('is-open')) positionPanel();
  }

  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onDocKeydown);
  window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.classList.contains('is-open') ? close() : open();
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  syncTriggerText();
  buildPanel();

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    element: wrapper,

    getValue() {
      return currentValue;
    },

    setValue(val) {
      currentValue = val;
      syncTriggerText();
      buildPanel();
    },

    dispose() {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKeydown);
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
      panel.remove();
    },
  };
}
