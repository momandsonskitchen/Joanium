export function createCheckbox({ label, description = '', checked = false, onChange }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'joanium-checkbox';
  button.setAttribute('aria-pressed', checked ? 'true' : 'false');

  const marker = document.createElement('span');
  marker.className = 'joanium-checkbox__marker';

  const markerDot = document.createElement('span');
  markerDot.className = 'joanium-checkbox__marker-dot';
  marker.append(markerDot);

  const content = document.createElement('span');
  content.className = 'joanium-checkbox__content';

  const labelNode = document.createElement('span');
  labelNode.className = 'joanium-checkbox__label';
  labelNode.textContent = label;
  content.append(labelNode);

  if (description) {
    const descriptionNode = document.createElement('span');
    descriptionNode.className = 'joanium-checkbox__description';
    descriptionNode.textContent = description;
    content.append(descriptionNode);
  }

  button.append(marker, content);

  const applyCheckedState = (nextChecked) => {
    button.classList.toggle('is-checked', nextChecked);
    button.setAttribute('aria-pressed', nextChecked ? 'true' : 'false');
  };

  applyCheckedState(checked);

  button.addEventListener('click', () => {
    const nextChecked = !button.classList.contains('is-checked');
    applyCheckedState(nextChecked);

    if (typeof onChange === 'function') {
      onChange(nextChecked);
    }
  });

  return button;
}
