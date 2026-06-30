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
        { label: strings.items.newChat, combo: ['Ctrl', 'N'] },
        { label: strings.items.history, combo: ['Ctrl', 'H'] },
        { label: strings.items.events, combo: ['Ctrl', 'E'] },
        { label: strings.items.channels, combo: ['Ctrl', 'Shift', 'L'] },
        { label: strings.items.projects, combo: ['Ctrl', 'Shift', 'R'] },
        { label: strings.items.memory, combo: ['Ctrl', 'Shift', 'M'] },
        { label: strings.items.templates, combo: ['Ctrl', 'T'] },
        { label: strings.items.agents, combo: ['Ctrl', 'Shift', 'G'] },
        { label: strings.items.skills, combo: ['Ctrl', 'Shift', 'S'] },
        { label: strings.items.personas, combo: ['Ctrl', 'Shift', 'P'] },
        { label: strings.items.marketplace, combo: ['Ctrl', 'M'] },
        { label: strings.items.usage, combo: ['Ctrl', 'U'] },
        { label: strings.items.switchModel, combo: ['Ctrl', 'Shift', 'B'] },
        { label: strings.items.settings, combo: ['Ctrl', ','] },
      ],
    },
    {
      label: strings.groups.security,
      items: [{ label: strings.items.lock, combo: ['Ctrl', 'L'] }],
    },
  ];

  for (const group of groups) {
    const groupEl = createElement('div', 'chat-shortcuts__group');
    const groupHead = createElement('p', 'chat-shortcuts__group-label', group.label);
    const rows = createElement('div', 'chat-shortcuts__rows');

    for (const item of group.items) {
      const row = createElement('div', 'chat-shortcuts__row');
      const labelEl = createElement('span', 'chat-shortcuts__row-label', item.label);
      const keysEl = createElement('span', 'chat-shortcuts__row-keys');

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
