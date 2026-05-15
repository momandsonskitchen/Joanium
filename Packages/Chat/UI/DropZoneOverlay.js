import { createElement } from '../../Shared/Utils/DomUtils.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

export function createDropZoneOverlay(strings) {
  const overlay = createElement('div', 'chat-drop-overlay');

  const body = createElement('div', 'chat-drop-overlay__body');
  const ring = createElement('div', 'chat-drop-overlay__ring');
  const iconEl = createElement('span', 'chat-drop-overlay__icon');
  iconEl.append(createIcon('paperclip', 'chat-drop-overlay__icon-glyph'));
  ring.append(iconEl);

  const label = createElement('p', 'chat-drop-overlay__label', strings.dropZone.label);
  const hint = createElement('p', 'chat-drop-overlay__hint', strings.dropZone.hint);

  body.append(ring, label, hint);
  overlay.append(body);

  return overlay;
}
