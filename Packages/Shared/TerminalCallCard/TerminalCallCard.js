import { getConnectorIconPathForToolName } from '../Icons/ConnectorIcons/ConnectorIcons.js';
import { createIcon } from '../Icons/Icons.js';
import { createElement } from '../Utils/DomUtils.js';

export function createTerminalToolIcon(toolName, className = 'chat-terminal-call__icon') {
  const iconPath = getConnectorIconPathForToolName(toolName);

  if (!iconPath) {
    return createIcon('terminal', className);
  }

  const img = document.createElement('img');
  img.src = iconPath;
  img.alt = '';
  img.className = `${className} chat-terminal-call__icon--connector`;
  return img;
}

export function createTerminalCallCard({
  status = 'running',
  iconToolName = '',
  label = '',
  command = '',
  statusLabel = status,
  output = '',
} = {}) {
  const outputText = String(output ?? '').trim();
  const hasOutput = Boolean(outputText);
  const card = hasOutput
    ? Object.assign(document.createElement('details'), {
        className: `chat-terminal-call chat-terminal-call--${status}`,
      })
    : createElement('section', `chat-terminal-call chat-terminal-call--${status}`);

  const header = createElement(hasOutput ? 'summary' : 'div', 'chat-terminal-call__header');
  const identity = createElement('div', 'chat-terminal-call__identity');
  const copy = createElement('div', 'chat-terminal-call__copy');

  identity.append(createTerminalToolIcon(iconToolName || command));
  copy.append(
    createElement('div', 'chat-terminal-call__label', label),
    createElement('div', 'chat-terminal-call__command', command),
  );
  identity.append(copy);

  const statusEl = createElement('span', 'chat-terminal-call__status', statusLabel);
  header.append(identity);

  if (hasOutput) {
    const trailing = createElement('div', 'chat-terminal-call__trailing');
    trailing.append(statusEl, createIcon('chevronDown', 'chat-terminal-call__details-icon'));
    header.append(trailing);
    card.append(header, createElement('pre', 'chat-terminal-call__output', outputText));
  } else {
    header.append(statusEl);
    card.append(header);
  }

  return card;
}
