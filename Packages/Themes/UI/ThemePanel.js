import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { applyThemeState } from './ThemeController.js';

function createSegmentedOption(label, value, groupName) {
  const button = createElement('button', 'theme-segmented__button', label);
  button.type = 'button';
  button._value = value;
  button._groupName = groupName;
  return button;
}

export function createThemePanel(strings) {
  const panel = createElement('div', 'theme-panel');
  const header = createElement('div', 'theme-panel__header');
  header.append(
    createElement('h3', 'theme-panel__title', strings.title),
    createElement('p', 'theme-panel__subtitle', strings.subtitle)
  );

  const modeGroup = createElement('section', 'theme-card');
  modeGroup.append(createElement('div', 'theme-card__label', strings.mode.label));
  const modeControls = createElement('div', 'theme-segmented');
  const modeButtons = [
    createSegmentedOption(strings.mode.system, 'system', 'mode'),
    createSegmentedOption(strings.mode.light, 'light', 'mode'),
    createSegmentedOption(strings.mode.dark, 'dark', 'mode')
  ];
  modeControls.append(...modeButtons);
  modeGroup.append(modeControls, createElement('p', 'theme-card__hint', strings.helper.system));

  const motionGroup = createElement('section', 'theme-card');
  motionGroup.append(createElement('div', 'theme-card__label', strings.motion.label));
  const motionControls = createElement('div', 'theme-segmented');
  const motionButtons = [
    createSegmentedOption(strings.motion.full, 'full', 'motion'),
    createSegmentedOption(strings.motion.reduced, 'reduced', 'motion')
  ];
  motionControls.append(...motionButtons);
  motionGroup.append(motionControls, createElement('p', 'theme-card__hint', strings.helper.motion));

  const feedback = createElement('div', 'theme-panel__feedback');
  feedback.hidden = true;
  feedback.setAttribute('aria-live', 'polite');

  let state = { mode: 'system', motion: 'full' };

  function syncButtons() {
    for (const button of [...modeButtons, ...motionButtons]) {
      const active = state[button._groupName] === button._value;
      button.classList.toggle('theme-segmented__button--active', active);
    }
  }

  async function save(nextState) {
    state = nextState;
    applyThemeState(state);
    syncButtons();

    try {
      state = await invokeIpc('themes:save', state);
      applyThemeState(state);
      syncButtons();
      feedback.textContent = strings.saved;
      feedback.hidden = false;
    } catch {
      feedback.hidden = true;
    }
  }

  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      void save({ ...state, mode: button._value });
    });
  }

  for (const button of motionButtons) {
    button.addEventListener('click', () => {
      void save({ ...state, motion: button._value });
    });
  }

  panel.append(header, modeGroup, motionGroup, feedback);

  void invokeIpc('themes:get')
    .then((loaded) => {
      state = loaded ?? state;
      applyThemeState(state);
      syncButtons();
    })
    .catch(syncButtons);

  syncButtons();
  return panel;
}
