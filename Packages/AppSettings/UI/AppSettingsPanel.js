import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';

const OPTION_KEYS = ['runOnStartup', 'systemTray', 'keepAwake', 'completionSound'];

export function createAppSettingsPanel(strings) {
  const view = createElement('div', 'app-settings');
  const options = createElement('div', 'app-settings__options');
  const status = createElement('p', 'app-settings__status');
  let settings = null;



  function setStatus(message, tone = 'ok') {
    status.textContent = message;
    status.className = `app-settings__status app-settings__status--${tone}`;
    if (message) {
      setTimeout(() => {
        status.textContent = '';
        status.className = 'app-settings__status';
      }, 2600);
    }
  }

  async function updateSetting(key, value, checkboxElement) {
    checkboxElement.disabled = true;

    try {
      settings = await invokeIpc('app-settings:save', { [key]: value });
      window.dispatchEvent(new CustomEvent('joanium:app-settings-changed', { detail: settings }));
      setStatus(strings.saved);
    } catch {
      checkboxElement.classList.toggle('is-checked', !value);
      checkboxElement.setAttribute('aria-pressed', !value ? 'true' : 'false');
      setStatus(strings.saveFailed, 'error');
    } finally {
      checkboxElement.disabled = false;
    }
  }

  async function populate() {
    settings = await invokeIpc('app-settings:get');
    options.replaceChildren();

    for (const key of OPTION_KEYS) {
      const option = strings.options[key];
      const checkbox = createCheckbox({
        label: option.label,
        description: option.description,
        checked: Boolean(settings[key]),
        onChange: (checked) => {
          void updateSetting(key, checked, checkbox.element);
        }
      });
      options.append(checkbox.element);
    }

  }

  view.append(options, status);
  void populate().catch(() => setStatus(strings.saveFailed, 'error'));
  return view;
}
