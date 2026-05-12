// ══════════════════════════════════════════════════════════════════════════
//  Joanium — PanelHeader shared component
//  Builds the standard drag-region header used across all chat sidebar panels.
//
//  Usage:
//    import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';
//
//    const header = createPanelHeader({
//      title:    strings.title,
//      subtitle: strings.subtitle,
//      // actions: [someButtonElement]   ← optional, appended after the copy block
//    });
//    panel.append(header);
//
//  The returned element is a `.panel-header` div.
//  The inner copy block is `.panel-header__copy`, pointer-events: none.
//  Any action elements you pass are appended after the copy block and inherit
//  no special styling — style them in the calling panel's own CSS.
// ══════════════════════════════════════════════════════════════════════════

import { createElement } from '../Utils/DomUtils.js';

/**
 * @param {object}        options
 * @param {string}        options.title     — heading text
 * @param {string}        options.subtitle  — subheading / description text
 * @param {HTMLElement[]} [options.actions] — optional elements appended after the copy block
 * @returns {HTMLElement}
 */
export function createPanelHeader({ title, subtitle, actions = [] } = {}) {
  const header = createElement('div', 'panel-header');

  const copy = createElement('div', 'panel-header__copy');
  copy.append(
    createElement('h2', 'panel-header__title', title),
    createElement('p', 'panel-header__subtitle', subtitle),
  );

  header.append(copy, ...actions);
  return header;
}
