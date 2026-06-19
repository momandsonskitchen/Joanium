import strings from '../I18n/en.js';
import { createContextMetrics } from './ContextMetrics.js';
import { createVisualizerElements } from './ContextVisualizerElements.js';

export function createContextVisualizer() {
  const text = strings.contextVisualizer;
  const { container, label, bar } = createVisualizerElements(text);

  function update(input = {}) {
    const metrics = createContextMetrics(input);

    label.textContent = metrics.usageLabel;
    bar.className = `context-viz__bar context-viz__bar--${metrics.status}`;
    bar.style.width = `${metrics.percent}%`;
  }

  function dispose() {
    container.remove();
  }

  return {
    element: container,
    update,
    dispose,
  };
}
