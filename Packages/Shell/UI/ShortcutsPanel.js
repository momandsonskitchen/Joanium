import { createElement } from '../../Shared/Utils/DomUtils.js';

/**
 * Builds and returns the Keyboard Shortcuts settings sub-panel.
 *
 * @param {object} strings  Shell i18n `shortcuts` subtree
 * @returns {HTMLElement}
 */
export function createShortcutsPanel(strings) {
  const view = createElement('div', 'chat-shortcuts');

  /** @type {Array<{ label: string, items: Array<{ label: string, combo: string[] }> }>} */
  const groups = [
    {
      label: strings.groups.navigation,
      items: [
        { label: strings.items.newChat,      combo: ['Ctrl', 'N'] },
        { label: strings.items.history,      combo: ['Ctrl', 'H'] },
        { label: strings.items.projects,     combo: ['Ctrl', 'P'] },
        { label: strings.items.templates,    combo: ['Ctrl', 'T'] },
        { label: strings.items.agents,       combo: ['Ctrl', 'A'] },
        { label: strings.items.skills,       combo: ['Ctrl', '⇧', 'S'] },
        { label: strings.items.personas,     combo: ['Ctrl', '⇧', 'P'] },
        { label: strings.items.marketplace,  combo: ['Ctrl', 'M'] },
        { label: strings.items.settings,     combo: ['Ctrl', 'S'] }
      ]
    }
  ];

  for (const group of groups) {
    const groupEl   = createElement('div', 'chat-shortcuts__group');
    const groupHead = createElement('p',   'chat-shortcuts__group-label', group.label);
    const rows      = createElement('div', 'chat-shortcuts__rows');

    for (const item of group.items) {
      const row     = createElement('div',  'chat-shortcuts__row');
      const labelEl = createElement('span', 'chat-shortcuts__row-label', item.label);
      const keysEl  = createElement('span', 'chat-shortcuts__row-keys');

      for (const key of item.combo) {
        keysEl.append(createElement('kbd', 'chat-shortcuts__key', key));
      }

      row.append(labelEl, keysEl);
      rows.append(row);
    }

    groupEl.append(groupHead, rows);
    view.append(groupEl);
  }

  return view;
}
