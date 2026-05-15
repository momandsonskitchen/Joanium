import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { formatBytes, getFileExtension } from './Utils.js';

export function createAttachmentPill(attachment, strings, { removable = false, onRemove } = {}) {
  const pill = createElement('div', 'chat-attachment');

  // For image attachments that still have their base64 data in memory,
  // show a small thumbnail instead of the plain extension badge.
  let badge;
  if (attachment.kind === 'image' && attachment.base64 && attachment.mimeType) {
    badge = createElement('span', 'chat-attachment__badge chat-attachment__badge--thumb');
    const thumb = document.createElement('img');
    thumb.src = `data:${attachment.mimeType};base64,${attachment.base64}`;
    thumb.className = 'chat-attachment__thumb';
    thumb.alt = '';
    thumb.draggable = false;
    badge.append(thumb);
  } else {
    badge = createElement('span', 'chat-attachment__badge', getFileExtension(attachment.name));
  }
  const body = createElement('span', 'chat-attachment__body');
  const name = createElement(
    'span',
    'chat-attachment__name',
    attachment.name || strings.composer.unknownAttachment,
  );
  const metaParts = [attachment.summary, formatBytes(attachment.size)].filter(Boolean);
  const meta = createElement('span', 'chat-attachment__meta', metaParts.join(' - '));

  body.append(name, meta);
  pill.append(badge, body);

  if (removable) {
    const removeButton = createElement('button', 'chat-attachment__remove');
    removeButton.type = 'button';
    removeButton.setAttribute(
      'aria-label',
      formatText(strings.composer.removeAttachmentNamed, {
        name: attachment.name || strings.composer.unknownAttachment,
      }),
    );
    removeButton.append(createIcon('close', 'chat-attachment__remove-icon'));
    removeButton.addEventListener('click', () => onRemove?.(attachment.id));
    pill.append(removeButton);
  }

  return pill;
}
