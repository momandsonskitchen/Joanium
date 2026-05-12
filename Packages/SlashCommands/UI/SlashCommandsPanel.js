import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

/**
 * Builds and returns the Slash Commands settings sub-panel.
 * Automatically reads all registered slash commands from the SlashCommands
 * package via IPC and groups them by type (action, mode, navigate).
 *
 * @param {object} strings  SlashCommands i18n `panel` subtree
 * @returns {Promise<HTMLElement>}
 */
export async function createSlashCommandsPanel(strings) {
  const view = createElement('div', 'chat-shortcuts');

  let commands = [];
  try {
    commands = await invokeIpc('slash-commands:list');
  } catch {
    // Non-fatal — render empty state below.
  }

  if (!commands.length) {
    view.append(createElement('p', 'chat-shortcuts__empty', strings.empty));
    return view;
  }

  const groupDefs = [
    { type: 'action', label: strings.groups.actions },
    { type: 'mode', label: strings.groups.modes },
    { type: 'navigate', label: strings.groups.navigation },
  ];

  for (const { type, label } of groupDefs) {
    const items = commands.filter((c) => c.type === type);
    if (!items.length) continue;

    const groupEl = createElement('div', 'chat-shortcuts__group');
    const heading = createElement('p', 'chat-shortcuts__group-label', label);
    const rows = createElement('div', 'chat-shortcuts__rows');

    for (const cmd of items) {
      const row = createElement('div', 'chat-shortcuts__row');
      const name = createElement('span', 'chat-shortcuts__row-label', `/${cmd.id}`);
      const desc = createElement('span', 'chat-shortcuts__row-desc', cmd.description);
      row.append(name, desc);
      rows.append(row);
    }

    groupEl.append(heading, rows);
    view.append(groupEl);
  }

  return view;
}
