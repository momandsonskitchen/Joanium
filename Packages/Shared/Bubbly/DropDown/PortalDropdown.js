export function createPortalDropdownController({ wrapper, panel, trigger, positionPanel, onOpen }) {
  function isOpen() {
    return wrapper.classList.contains('is-open');
  }

  function open() {
    positionPanel();
    wrapper.classList.add('is-open');
    panel.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    onOpen?.();
  }

  function close() {
    wrapper.classList.remove('is-open');
    panel.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function onDocumentClick(event) {
    if (!wrapper.contains(event.target) && !panel.contains(event.target)) close();
  }

  function onDocumentKeydown(event) {
    if (event.key === 'Escape') close();
  }

  function onScrollOrResize() {
    if (isOpen()) positionPanel();
  }

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    isOpen() ? close() : open();
  });

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });

  return {
    close,
    dispose() {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
      panel.remove();
    },
  };
}
