import { createPortalDropdownController } from './PortalDropdown.js';

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
  let dropdownController = null;

  function updateTriggerText() {
    const match = options.find((o) => o.value === currentValue);
    triggerText.textContent = match ? match.label : (placeholder ?? 'Select');
    triggerText.classList.toggle('joanium-dropdown__trigger-text--placeholder', !match);

    // Show provider icon in the trigger when the selected option has one.
    const existingIcon = trigger.querySelector('.joanium-dropdown__trigger-icon');
    existingIcon?.remove();
    if (match?.iconPath) {
      const icon = document.createElement('img');
      icon.className = 'joanium-dropdown__trigger-icon';
      icon.src = match.iconPath;
      icon.alt = '';
      icon.draggable = false;
      trigger.prepend(icon);
    }
  }

  function buildOptions() {
    panel.innerHTML = '';
    for (const option of options) {
      if (!option.value) continue;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'joanium-dropdown__option';
      item.setAttribute('role', 'option');
      item.classList.toggle('is-selected', option.value === currentValue);

      if (option.iconPath) {
        const icon = document.createElement('img');
        icon.className = 'joanium-dropdown__option-icon';
        icon.src = option.iconPath;
        icon.alt = '';
        icon.draggable = false;
        item.append(icon);
      }

      const labelSpan = document.createElement('span');
      labelSpan.textContent = option.label;
      item.append(labelSpan);

      item.addEventListener('click', (event) => {
        event.stopPropagation();
        currentValue = option.value;
        updateTriggerText();
        buildOptions();
        dropdownController?.close();
        if (typeof onChange === 'function') onChange(option.value);
      });
      panel.append(item);
    }
  }

  // Position the portalled panel directly below the trigger using fixed coords.
  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.width = `${rect.width}px`;
  }

  dropdownController = createPortalDropdownController({
    wrapper,
    panel,
    trigger,
    positionPanel,
  });

  updateTriggerText();
  buildOptions();

  wrapper.append(trigger);

  return {
    element: wrapper,
    getValue() {
      return currentValue;
    },
    setValue(value) {
      currentValue = value ?? '';
      updateTriggerText();
      buildOptions();
    },
    dispose() {
      dropdownController.dispose();
    },
  };
}
