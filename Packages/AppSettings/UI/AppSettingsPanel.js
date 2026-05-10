import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';
import { createDropDown } from '../../Shared/DropDown/DropDown.js';

const OPTION_KEYS = ['runOnStartup', 'systemTray', 'keepAwake', 'completionSound'];

export function createAppSettingsPanel(strings) {
  const view = createElement('div', 'app-settings');
  const options = createElement('div', 'app-settings__options');
  const status = createElement('p', 'app-settings__status');
  let settings = null;
  let defaultViewDropdown = null;



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

  async function updateDefaultView(value) {
    try {
      settings = await invokeIpc('app-settings:save', { defaultView: value });
      window.dispatchEvent(new CustomEvent('joanium:app-settings-changed', { detail: settings }));
      setStatus(strings.saved);
    } catch {
      setStatus(strings.saveFailed, 'error');
    }
  }

  async function populate() {
    settings = await invokeIpc('app-settings:get');
    options.replaceChildren();
    defaultViewDropdown?.dispose();
    defaultViewDropdown = null;

    // ── Default view row (first) ───────────────────────────────────────────
    const viewOptions = Object.entries(strings.defaultView.views).map(([value, label]) => ({ value, label }));
    defaultViewDropdown = createDropDown({
      label: '',
      options: viewOptions,
      selectedValue: settings.defaultView ?? 'chat',
      onChange: (value) => { void updateDefaultView(value); }
    });

    const dropdownRow = createElement('div', 'app-settings__dropdown-row');
    const dropdownMeta = createElement('div', 'app-settings__dropdown-meta');
    const dropdownLabel = createElement('span', 'app-settings__dropdown-label', strings.defaultView.label);
    const dropdownDesc = createElement('span', 'app-settings__dropdown-desc', strings.defaultView.description);
    dropdownMeta.append(dropdownLabel, dropdownDesc);
    dropdownRow.append(dropdownMeta, defaultViewDropdown.element);
    options.append(dropdownRow);

    // ── Boolean toggles ───────────────────────────────────────────────────
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
