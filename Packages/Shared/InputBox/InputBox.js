export function createInputBox({
  label,
  value = '',
  placeholder = '',
  description = '',
  type = 'text',
  inputMode = 'text',
  focusKey = '',
  maxLength,
  autoFocus = false,
  onInput,
  onKeyDown
}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'joanium-input';

  const labelNode = document.createElement('span');
  labelNode.className = 'joanium-input__label';
  labelNode.textContent = label;
  wrapper.append(labelNode);

  const field = document.createElement('input');
  field.className = 'joanium-input__field';
  field.type = type;
  field.inputMode = inputMode;
  field.value = value;
  field.placeholder = placeholder;
  field.__focusKey = focusKey;

  if (typeof maxLength === 'number') {
    field.maxLength = maxLength;
  }

  if (autoFocus) {
    requestAnimationFrame(() => {
      field.focus();
    });
  }

  if (typeof onInput === 'function') {
    field.addEventListener('input', (event) => {
      onInput(event.target.value);
    });
  }

  if (typeof onKeyDown === 'function') {
    field.addEventListener('keydown', onKeyDown);
  }

  wrapper.append(field);

  if (description) {
    const descriptionNode = document.createElement('span');
    descriptionNode.className = 'joanium-input__description';
    descriptionNode.textContent = description;
    wrapper.append(descriptionNode);
  }

  return {
    element: wrapper,
    input: field
  };
}
