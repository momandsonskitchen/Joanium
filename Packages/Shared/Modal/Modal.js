import { attachCustomScrollbar } from '../CustomScrollbar/CustomScrollbar.js';

export function createModal({ closeLabel, width = '720px', height = '100vh' }) {
  const overlay = document.createElement('div');
  overlay.className = 'joanium-modal';

  const panel = document.createElement('section');
  panel.className = 'joanium-modal__panel';
  panel.style.width = `min(${width}, 100%)`;
  panel.style.maxHeight = height;

  const header = document.createElement('header');
  header.className = 'joanium-modal__header';

  const titleNode = document.createElement('h3');
  titleNode.className = 'joanium-modal__title';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'joanium-modal__close';
  closeButton.textContent = closeLabel;

  header.append(titleNode, closeButton);

  /* ── scrollable body region ─────────────────────────────────────────────
     Wrapped in a relative container so the custom scrollbar track is
     scoped to just the body area (below the header).
  ── */
  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'joanium-modal__body-wrap';

  const body = document.createElement('div');
  body.className = 'joanium-modal__body';

  bodyWrap.append(body);
  panel.append(header, bodyWrap);
  overlay.append(panel);

  /* attach the shared custom scrollbar once (it persists across opens) */
  const scrollbar = attachCustomScrollbar(bodyWrap, body, {
    top: 8,
    bottom: 8,
    right: 6,
  });

  function close() {
    overlay.classList.remove('is-open');
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  return {
    element: overlay,
    open({ title, nodes }) {
      titleNode.textContent = title;
      body.replaceChildren(...nodes);
      overlay.classList.add('is-open');
      /* nudge the scrollbar to recalculate after new content */
      body.scrollTop = 0;
    },
    close,
    /** Call if the modal element is removed from the DOM entirely. */
    destroy() {
      scrollbar.dispose();
    },
  };
}
