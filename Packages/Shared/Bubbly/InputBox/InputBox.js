// Keys that must always pass through regardless of any allow filter:
// navigation, editing, and clipboard shortcuts.
const ALWAYS_ALLOWED_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

function isClipboardShortcut(event) {
  return (event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase());
}

// Built-in filters. Each returns true when the key should be allowed.
const INPUT_FILTERS = {
  // Digits 0-9 only
  numeric(event) {
    return event.key >= '0' && event.key <= '9';
  },
  // a-z / A-Z only
  alpha(event) {
    return /^[a-zA-Z]$/.test(event.key);
  },
  // Digits and letters
  alphanumeric(event) {
    return /^[a-zA-Z0-9]$/.test(event.key);
  },
};

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
  // Pass one of the built-in filter names ('numeric', 'alpha', 'alphanumeric')
  // or a custom function (event) => boolean to restrict which characters are
  // accepted. When omitted every keystroke is allowed through.
  allow,
  onInput,
  onKeyDown,
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

  // Resolve the allow filter into a test function, or null if unrestricted.
  const allowFilter =
    typeof allow === 'function'
      ? allow
      : typeof allow === 'string'
        ? (INPUT_FILTERS[allow] ?? null)
        : null;

  if (allowFilter !== null) {
    field.addEventListener('keydown', (event) => {
      if (ALWAYS_ALLOWED_KEYS.has(event.key) || isClipboardShortcut(event)) {
        return;
      }
      if (!allowFilter(event)) {
        event.preventDefault();
      }
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
    input: field,
  };
}
