export function createApiKeyInput({
  label,
  value = '',
  placeholder = '',
  description = '',
  focusKey = '',
  revealLabel,
  hideLabel,
  onInput,
}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'joanium-secret';

  const labelNode = document.createElement('span');
  labelNode.className = 'joanium-secret__label';
  labelNode.textContent = label;
  wrapper.append(labelNode);

  const fieldWrap = document.createElement('span');
  fieldWrap.className = 'joanium-secret__field-wrap';

  const input = document.createElement('input');
  input.className = 'joanium-secret__field';
  input.type = 'password';
  input.value = value;
  input.placeholder = placeholder;
  input.__focusKey = focusKey;

  if (typeof onInput === 'function') {
    input.addEventListener('input', (event) => {
      onInput(event.target.value);
    });
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'joanium-secret__toggle';
  toggle.textContent = revealLabel;

  toggle.addEventListener('click', () => {
    const nextIsHidden = input.type === 'password';
    input.type = nextIsHidden ? 'text' : 'password';
    toggle.textContent = nextIsHidden ? hideLabel : revealLabel;
  });

  fieldWrap.append(input, toggle);
  wrapper.append(fieldWrap);

  if (description) {
    const descriptionNode = document.createElement('span');
    descriptionNode.className = 'joanium-secret__description';
    descriptionNode.textContent = description;
    wrapper.append(descriptionNode);
  }

  return {
    element: wrapper,
    input,
  };
}
