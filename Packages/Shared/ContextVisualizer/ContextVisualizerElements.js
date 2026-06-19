import { createElement } from '../Utils/DomUtils.js';

export function createVisualizerElements(strings) {
  const container = createElement('section', 'context-viz');
  container.setAttribute('aria-label', strings.title);

  const label = createElement('span', 'context-viz__label');
  const track = createElement('span', 'context-viz__track');
  const bar = createElement('span', 'context-viz__bar');
  track.append(bar);
  container.append(label, track);

  return {
    container,
    label,
    bar,
  };
}
