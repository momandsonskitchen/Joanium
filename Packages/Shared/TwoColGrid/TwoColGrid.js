// ══════════════════════════════════════════════════════════════════════════
//  Joanium — TwoColGrid shared component
//  Renders items into two independent flex columns so expanding one card
//  never affects the spacing of cards in the other column.
//
//  Usage:
//    import { createTwoColGrid } from '../../Shared/TwoColGrid/TwoColGrid.js';
//
//    const grid = createTwoColGrid();
//    grid.append(cardA);   // → left column
//    grid.append(cardB);   // → right column
//    grid.append(cardC);   // → left column
//    grid.append(cardD);   // → right column
//
//    panel.append(grid.el);
//
//  API:
//    grid.el        — the root <section class="two-col-grid"> element
//    grid.append()  — distributes items alternately: even index → left, odd → right
// ══════════════════════════════════════════════════════════════════════════

import { createElement } from '../Utils/DomUtils.js';

/**
 * @returns {{ el: HTMLElement, append: (item: HTMLElement) => void }}
 */
export function createTwoColGrid() {
  const el = createElement('section', 'two-col-grid');
  const colA = createElement('div', 'two-col-grid__col');
  const colB = createElement('div', 'two-col-grid__col');
  el.append(colA, colB);

  let count = 0;

  function append(item) {
    (count % 2 === 0 ? colA : colB).append(item);
    count++;
  }

  return { el, append };
}
