import { createElement } from '../Utils/DomUtils.js';

export function createInputBoxLite({
  label,
  value = '',
  placeholder = '',
  description = '',
  type = 'text',
  inputMode = 'text',
  maxLength,
  autoFocus = false,
  className = '',
  labelClassName = '',
  descriptionClassName = '',
  onInput,
  onKeyDown
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'joanium-input-lite';

  if (label) {
    const labelNode = document.createElement('label');
    labelNode.className = labelClassName || 'joanium-input-lite__label';
    labelNode.textContent = label;
    wrapper.append(labelNode);
  }

  const field = document.createElement('input');
  field.className = className || 'joanium-input-lite__field';
  field.type = type;
  field.inputMode = inputMode;
  field.value = value;
  field.placeholder = placeholder;

  if (typeof maxLength === 'number') {
    field.maxLength = maxLength;
  }

  if (autoFocus) {
    requestAnimationFrame(() => field.focus());
  }

  if (typeof onInput === 'function') {
    field.addEventListener('input', (event) => onInput(event.target.value));
  }

  if (typeof onKeyDown === 'function') {
    field.addEventListener('keydown', onKeyDown);
  }

  if (!label && !description) {
    return {
      element: field,
      input: field
    };
  }

  wrapper.append(field);

  if (description) {
    const descNode = document.createElement('span');
    descNode.className = descriptionClassName || 'joanium-input-lite__description';
    descNode.textContent = description;
    wrapper.append(descNode);
  }

  return {
    element: wrapper,
    input: field
  };
}
