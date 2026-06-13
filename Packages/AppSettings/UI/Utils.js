import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { EVENTS, dispatchEvent } from '../../Shared/Events/RendererEvents.js';

export function createSettingsStatus(status) {
  let clearTimer = null;

  return function setStatus(message, tone = 'ok') {
    clearTimeout(clearTimer);
    status.textContent = message;
    status.className = `app-settings__status app-settings__status--${tone}`;
    if (message) {
      clearTimer = setTimeout(() => {
        status.textContent = '';
        status.className = 'app-settings__status';
      }, 2600);
    }
  };
}

export async function saveAppSettingsPatch(patch, { strings, setStatus, onSaved }) {
  const settings = await invokeIpc('app-settings:save', patch);
  dispatchEvent(EVENTS.APP_SETTINGS_CHANGED, settings);
  onSaved?.(settings);
  setStatus(strings.saved);
  return settings;
}

export async function updateCheckboxSetting({
  key,
  value,
  checkboxElement,
  strings,
  setStatus,
  onSaved,
}) {
  checkboxElement.disabled = true;

  try {
    await saveAppSettingsPatch({ [key]: value }, { strings, setStatus, onSaved });
  } catch {
    checkboxElement.classList.toggle('is-checked', !value);
    checkboxElement.setAttribute('aria-pressed', !value ? 'true' : 'false');
    setStatus(strings.saveFailed, 'error');
  } finally {
    checkboxElement.disabled = false;
  }
}

export function createSettingsPanelState({ status, strings }) {
  const setStatus = createSettingsStatus(status);
  let settings = null;

  function setSettings(nextSettings) {
    settings = nextSettings;
  }

  async function savePatch(patch) {
    await saveAppSettingsPatch(patch, { strings, setStatus, onSaved: setSettings });
  }

  async function updateSetting(key, value, checkboxElement) {
    await updateCheckboxSetting({
      key,
      value,
      checkboxElement,
      strings,
      setStatus,
      onSaved: setSettings,
    });
  }

  return {
    get settings() {
      return settings;
    },
    setSettings,
    setStatus,
    savePatch,
    updateSetting,
  };
}
