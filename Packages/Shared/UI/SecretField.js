import { createElement } from '../Utils/DomUtils.js';
import { createIcon } from '../Icons/Icons.js';

export function createSecretField({
  label,
  placeholder,
  strings,
  className = 'shared',
  type = 'password',
}) {
  const wrap = createElement('label', `${className}-field`);
  const labelEl = createElement('span', `${className}-field__label`, label);
  const holder = createElement('div', `${className}-field__secret`);
  const input = document.createElement('input');
  input.type = type;
  input.className = `${className}-field__input ${type === 'password' ? `${className}-field__input--secret` : ''}`;
  input.placeholder = placeholder ?? '';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const toggle = createElement('button', `${className}-field__secret-toggle`);
  toggle.type = 'button';
  toggle.setAttribute('aria-label', strings?.show ?? 'Show');
  toggle.append(createIcon('eye', `${className}-field__secret-icon`));

  toggle.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    toggle.setAttribute(
      'aria-label',
      isHidden ? (strings?.show ?? 'Show') : (strings?.hide ?? 'Hide'),
    );
  });

  holder.append(input, toggle);
  wrap.append(labelEl, holder);
  return { wrap, input };
}
