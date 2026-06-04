export function createButton({
  label,
  variant = 'primary',
  size = 'regular',
  disabled = false,
  leadingIcon = '',
  trailingIcon = '',
  onClick,
}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `joanium-button joanium-button--${variant} joanium-button--${size}`;
  button.disabled = disabled;

  if (leadingIcon) {
    const leading = document.createElement('span');
    leading.className = 'joanium-button__icon';
    leading.textContent = leadingIcon;
    button.append(leading);
  }

  const labelNode = document.createElement('span');
  labelNode.className = 'joanium-button__label';
  labelNode.textContent = label;
  button.append(labelNode);

  if (trailingIcon) {
    const trailing = document.createElement('span');
    trailing.className = 'joanium-button__icon';
    trailing.textContent = trailingIcon;
    button.append(trailing);
  }

  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return { element: button };
}
