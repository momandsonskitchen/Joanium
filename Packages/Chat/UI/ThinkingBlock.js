import { createElement } from '../../Shared/Utils/DomUtils.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

export function createThinkingBlock(strings, thinking = '', { hidden = !thinking } = {}) {
  const thinkingWrap = document.createElement('details');
  thinkingWrap.className = 'chat-message__thinking';
  thinkingWrap.hidden = hidden;

  const thinkingSummary = createElement('summary', 'chat-message__thinking-summary');
  thinkingSummary.append(
    createIcon('thinking', 'chat-message__thinking-icon'),
    createElement('span', 'chat-message__thinking-label', strings.composer.reasoning),
  );
  thinkingWrap.append(thinkingSummary);

  const thinkingBody = createElement('div', 'chat-message__thinking-body');
  thinkingBody.append(createElement('p', 'chat-message__thinking-text', thinking ?? ''));
  thinkingWrap.append(thinkingBody);
  return thinkingWrap;
}

export function updateThinkingBlockText(thinkingWrap, thinking = '') {
  const thinkingText = thinkingWrap?.querySelector('.chat-message__thinking-text');
  if (thinkingText) thinkingText.textContent = thinking;
}

/**
 * Called once streaming is done — flips the label from "Reasoning" → "Reasoned".
 */
export function finalizeThinkingBlock(thinkingWrap, strings) {
  if (!thinkingWrap) return;
  const label = thinkingWrap.querySelector('.chat-message__thinking-label');
  if (label && strings?.composer?.reasoned) label.textContent = strings.composer.reasoned;
}
