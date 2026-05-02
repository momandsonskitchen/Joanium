export function createDropDown({ label, options, selectedValue, placeholder, focusKey, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'joanium-dropdown';

  const labelNode = document.createElement('span');
  labelNode.className = 'joanium-dropdown__label';
  labelNode.textContent = label;
  wrapper.append(labelNode);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'joanium-dropdown__trigger';
  if (focusKey) trigger.__focusKey = focusKey;

  const triggerText = document.createElement('span');
  triggerText.className = 'joanium-dropdown__trigger-text';

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'joanium-dropdown__chevron');
  chevron.setAttribute('viewBox', '0 0 16 16');
  chevron.setAttribute('fill', 'none');
  chevron.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 5.5L8 10.5L13 5.5');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  chevron.append(path);

  trigger.append(triggerText, chevron);

  // Panel is portalled to document.body so it is never clipped by any
  // ancestor's overflow or z-index stacking context (e.g. inside a modal).
  const panel = document.createElement('div');
  panel.className = 'joanium-dropdown__panel';
  panel.setAttribute('role', 'listbox');
  document.body.append(panel);

  let currentValue = selectedValue ?? '';

  function updateTriggerText() {
    const match = options.find((o) => o.value === currentValue);
    triggerText.textContent = match ? match.label : (placeholder ?? 'Select');
    triggerText.classList.toggle('joanium-dropdown__trigger-text--placeholder', !match);
  }

  function buildOptions() {
    panel.innerHTML = '';
    for (const option of options) {
      if (!option.value) continue;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'joanium-dropdown__option';
      item.setAttribute('role', 'option');
      item.textContent = option.label;
      item.classList.toggle('is-selected', option.value === currentValue);
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        currentValue = option.value;
        updateTriggerText();
        buildOptions();
        close();
        if (typeof onChange === 'function') onChange(option.value);
      });
      panel.append(item);
    }
  }

  // Position the portalled panel directly below the trigger using fixed coords.
  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    panel.style.left  = `${rect.left}px`;
    panel.style.top   = `${rect.bottom + 8}px`;
    panel.style.width = `${rect.width}px`;
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

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    wrapper.classList.contains('is-open') ? close() : open();
  });

  function onDocumentClick(event) {
    if (!wrapper.contains(event.target) && !panel.contains(event.target)) close();
  }

  function onDocumentKeydown(event) {
    if (event.key === 'Escape') close();
  }

  // Keep panel aligned if the page scrolls or the window resizes while open.
  function onScrollOrResize() {
    if (wrapper.classList.contains('is-open')) positionPanel();
  }

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });

  updateTriggerText();
  buildOptions();

  wrapper.append(trigger);

  return {
    element: wrapper,
    dispose() {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
      panel.remove();
    }
  };
}
