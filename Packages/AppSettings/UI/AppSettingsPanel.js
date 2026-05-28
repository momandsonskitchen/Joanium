import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';
import { createDropDown } from '../../Shared/DropDown/DropDown.js';
import {
  buildAvailableModelOptions,
  decodeModelValue,
  encodeModelValue,
} from '../../Shared/ProviderCatalog/ModelOptions.js';
import { createSettingsPanelState } from './Utils.js';

const OPTION_KEYS = ['runOnStartup', 'systemTray', 'keepAwake', 'completionSound', 'showTechFeed'];

export function createAppSettingsPanel(strings) {
  const view = createElement('div', 'app-settings');
  const options = createElement('div', 'app-settings__options');
  const danger = createElement('section', 'app-settings__danger');
  const status = createElement('p', 'app-settings__status');
  let defaultViewDropdown = null;
  let defaultModelDropdown = null;
  let defaultSearchEngineDropdown = null;
  let resetConfirmTimer = null;
  let resetConfirming = false;
  let disposed = false;
  let removeSettingsChangeListener = null;
  const state = createSettingsPanelState({ status, strings });

  function handleSettingsChanged(event) {
    if (!disposed) {
      state.setSettings(event.detail ?? state.settings);
    }
  }

  async function updateDefaultView(value) {
    try {
      await state.savePatch({ defaultView: value });
    } catch {
      state.setStatus(strings.saveFailed, 'error');
    }
  }

  async function updateDefaultModel(value) {
    try {
      const defaultModel = decodeModelValue(value);
      await state.savePatch({ defaultModel });
    } catch {
      state.setStatus(strings.saveFailed, 'error');
    }
  }

  async function updateDefaultSearchEngine(value) {
    try {
      await state.savePatch({ defaultSearchEngine: value });
    } catch {
      state.setStatus(strings.saveFailed, 'error');
    }
  }

  async function populate() {
    // Fetch app settings and provider catalog in parallel.
    const [nextSettings, bootstrap] = await Promise.all([
      invokeIpc('app-settings:get'),
      invokeIpc('chat:bootstrap').catch(() => ({ providers: [], user: {} })),
    ]);

    if (disposed) {
      return;
    }

    state.setSettings(nextSettings);
    resetConfirming = false;
    options.replaceChildren();
    danger.replaceChildren();
    defaultViewDropdown?.dispose();
    defaultViewDropdown = null;
    defaultModelDropdown?.dispose();
    defaultModelDropdown = null;
    defaultSearchEngineDropdown?.dispose();
    defaultSearchEngineDropdown = null;

    // ── Default view row ───────────────────────────────────────────────────
    const viewOptions = Object.entries(strings.defaultView.views).map(([value, label]) => ({
      value,
      label,
    }));
    defaultViewDropdown = createDropDown({
      label: '',
      options: viewOptions,
      selectedValue: state.settings.defaultView ?? 'chat',
      onChange: (value) => {
        void updateDefaultView(value);
      },
    });

    const dropdownRow = createElement('div', 'app-settings__dropdown-row');
    const dropdownMeta = createElement('div', 'app-settings__dropdown-meta');
    const dropdownLabel = createElement(
      'span',
      'app-settings__dropdown-label',
      strings.defaultView.label,
    );
    const dropdownDesc = createElement(
      'span',
      'app-settings__dropdown-desc',
      strings.defaultView.description,
    );
    dropdownMeta.append(dropdownLabel, dropdownDesc);
    dropdownRow.append(dropdownMeta, defaultViewDropdown.element);
    options.append(dropdownRow);

    // ── Default model row ──────────────────────────────────────────────────
    const providers = Array.isArray(bootstrap.providers) ? bootstrap.providers : [];
    const userProviderDetails = bootstrap.user?.providers?.details ?? {};
    const modelOptions = buildAvailableModelOptions(providers, userProviderDetails);

    // Pre-select: use the saved preference if present, otherwise fall back to
    // the first available model so something sensible is always shown.
    const savedModelValue = encodeModelValue(state.settings.defaultModel);
    const currentModelValue = savedModelValue || (modelOptions[0]?.value ?? '');

    defaultModelDropdown = createDropDown({
      label: '',
      options: modelOptions,
      selectedValue: currentModelValue,
      onChange: (value) => {
        void updateDefaultModel(value);
      },
    });

    const modelRow = createElement(
      'div',
      'app-settings__dropdown-row app-settings__dropdown-row--wide',
    );
    const modelMeta = createElement('div', 'app-settings__dropdown-meta');
    const modelLabel = createElement(
      'span',
      'app-settings__dropdown-label',
      strings.defaultModel.label,
    );
    const modelDesc = createElement(
      'span',
      'app-settings__dropdown-desc',
      strings.defaultModel.description,
    );
    modelMeta.append(modelLabel, modelDesc);
    modelRow.append(modelMeta, defaultModelDropdown.element);
    options.append(modelRow);

    // ── Default search engine row ──────────────────────────────────────────
    defaultSearchEngineDropdown = createDropDown({
      label: '',
      options: strings.defaultSearchEngine.options,
      selectedValue: state.settings.defaultSearchEngine ?? 'google',
      onChange: (value) => {
        void updateDefaultSearchEngine(value);
      },
    });

    const searchEngineRow = createElement('div', 'app-settings__dropdown-row');
    const searchEngineMeta = createElement('div', 'app-settings__dropdown-meta');
    searchEngineMeta.append(
      createElement('span', 'app-settings__dropdown-label', strings.defaultSearchEngine.label),
      createElement('span', 'app-settings__dropdown-desc', strings.defaultSearchEngine.description),
    );
    searchEngineRow.append(searchEngineMeta, defaultSearchEngineDropdown.element);
    options.append(searchEngineRow);

    // ── Boolean toggles ───────────────────────────────────────────────────
    for (const key of OPTION_KEYS) {
      const option = strings.options[key];
      const checkbox = createCheckbox({
        label: option.label,
        description: option.description,
        checked: Boolean(state.settings[key]),
        onChange: (checked) => {
          void state.updateSetting(key, checked, checkbox.element);
        },
      });
      options.append(checkbox.element);
    }

    danger.append(createElement('h3', 'app-settings__danger-title', strings.reset.title));
    const resetRow = createElement('div', 'app-settings__danger-row');
    const resetMeta = createElement('div', 'app-settings__dropdown-meta');
    resetMeta.append(
      createElement('span', 'app-settings__dropdown-label', strings.reset.label),
      createElement('span', 'app-settings__dropdown-desc', strings.reset.description),
      createElement('span', 'app-settings__danger-warning', strings.reset.warning),
    );
    const resetButton = createElement('button', 'app-settings__reset-btn', strings.reset.button);
    resetButton.type = 'button';
    resetButton.addEventListener('click', async () => {
      if (!resetConfirming) {
        resetConfirming = true;
        resetButton.classList.add('app-settings__reset-btn--confirm');
        resetButton.textContent = strings.reset.confirm;
        clearTimeout(resetConfirmTimer);
        resetConfirmTimer = setTimeout(() => {
          resetConfirming = false;
          resetButton.classList.remove('app-settings__reset-btn--confirm');
          resetButton.textContent = strings.reset.button;
        }, 3200);
        return;
      }

      clearTimeout(resetConfirmTimer);
      resetButton.disabled = true;
      resetButton.textContent = strings.reset.resetting;

      try {
        await invokeIpc('app-settings:reset-app');
      } catch {
        resetConfirming = false;
        resetButton.disabled = false;
        resetButton.classList.remove('app-settings__reset-btn--confirm');
        resetButton.textContent = strings.reset.button;
        state.setStatus(strings.reset.failed, 'error');
      }
    });
    resetRow.append(resetMeta, resetButton);
    danger.append(resetRow);

    if (!removeSettingsChangeListener) {
      window.addEventListener('joanium:app-settings-changed', handleSettingsChanged);
      removeSettingsChangeListener = () => {
        window.removeEventListener('joanium:app-settings-changed', handleSettingsChanged);
      };
    }
  }

  view._dispose = () => {
    disposed = true;
    clearTimeout(resetConfirmTimer);
    removeSettingsChangeListener?.();
    removeSettingsChangeListener = null;
    defaultViewDropdown?.dispose();
    defaultModelDropdown?.dispose();
    defaultSearchEngineDropdown?.dispose();
  };

  view.append(options, danger, status);
  void populate().catch(() => state.setStatus(strings.saveFailed, 'error'));
  return view;
}
