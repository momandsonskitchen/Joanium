import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';
import { createDropDown } from '../../Shared/DropDown/DropDown.js';

const OPTION_KEYS = [
  'runOnStartup',
  'systemTray',
  'keepAwake',
  'completionSound',
  'autoMemoryUpdates',
];

// Returns a flat list of { value, label } model options for all configured providers.
// value is "providerId/modelId". The list never contains an empty-value sentinel —
// the first item is used as the fallback selection when no preference is saved.
function buildModelOptions(providers, userProviderDetails) {
  const options = [];

  for (const provider of providers) {
    if (!provider.models?.length) continue;

    const details = userProviderDetails?.[provider.id] ?? {};
    const endpoint = (details.endpoint ?? '').trim() || (provider.endpoint ?? '').trim();
    if (!endpoint) continue;
    if (provider.requiresApiKey && !(details.apiKey ?? '').trim()) continue;

    for (const model of provider.models) {
      options.push({
        value: `${provider.id}/${model.id}`,
        label: `${provider.label} — ${model.name ?? model.id}`,
      });
    }
  }

  return options;
}

// Encode/decode the composite "providerId/modelId" string used by the dropdown.
function encodeModelValue(defaultModel) {
  if (!defaultModel?.providerId || !defaultModel?.modelId) return '';
  return `${defaultModel.providerId}/${defaultModel.modelId}`;
}

function decodeModelValue(value) {
  if (!value) return null;
  const slashIndex = value.indexOf('/');
  if (slashIndex < 0) return null;
  return {
    providerId: value.slice(0, slashIndex),
    modelId: value.slice(slashIndex + 1),
  };
}

export function createAppSettingsPanel(strings) {
  const view = createElement('div', 'app-settings');
  const options = createElement('div', 'app-settings__options');
  const runtime = createElement('section', 'app-settings__runtime');
  const danger = createElement('section', 'app-settings__danger');
  const status = createElement('p', 'app-settings__status');
  let settings = null;
  let languageDropdown = null;
  let defaultViewDropdown = null;
  let defaultModelDropdown = null;
  let autoUpdateState = null;
  let autoUpdateStatusEl = null;
  let autoUpdateDetailEl = null;
  let autoUpdateCheckBtn = null;
  let autoUpdateInstallBtn = null;
  let resetConfirmTimer = null;
  let resetConfirming = false;

  function autoUpdateStatusLabel(state) {
    const key = state?.enabled === false ? 'disabled' : (state?.status ?? 'idle');
    return strings.autoUpdate.statuses[key] ?? strings.autoUpdate.statuses.idle;
  }

  function autoUpdateDetail(state) {
    if (!state) return strings.autoUpdate.details.idle;
    if (state.error) return state.error;
    if (state.status === 'unsupported') return strings.autoUpdate.details.unsupported;
    if (state.status === 'disabled') return strings.autoUpdate.details.disabled;
    if (state.status === 'current') return strings.autoUpdate.details.current;
    if (state.status === 'downloaded') return strings.autoUpdate.details.downloaded;
    if (state.status === 'downloading') {
      const percent = Math.round(Number(state.progress?.percent) || 0);
      return strings.autoUpdate.details.downloading.replace('{percent}', String(percent));
    }
    return strings.autoUpdate.details.idle;
  }

  function syncAutoUpdateRuntime(nextState = autoUpdateState) {
    autoUpdateState = nextState;
    if (!autoUpdateStatusEl || !autoUpdateDetailEl) return;

    autoUpdateStatusEl.textContent = autoUpdateStatusLabel(autoUpdateState);
    autoUpdateDetailEl.textContent = autoUpdateDetail(autoUpdateState);

    const canCheck = Boolean(autoUpdateState?.enabled && autoUpdateState?.supported);
    const isChecking = autoUpdateState?.status === 'checking';
    if (autoUpdateCheckBtn) {
      autoUpdateCheckBtn.disabled = !canCheck || isChecking;
      autoUpdateCheckBtn.textContent = isChecking
        ? strings.autoUpdate.checking
        : strings.autoUpdate.check;
    }
    if (autoUpdateInstallBtn) {
      autoUpdateInstallBtn.hidden = !autoUpdateState?.downloaded;
      autoUpdateInstallBtn.disabled = !autoUpdateState?.downloaded;
    }
  }

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

  async function updateLanguage(value) {
    try {
      settings = await invokeIpc('app-settings:save', { locale: value });
      window.dispatchEvent(new CustomEvent('joanium:app-settings-changed', { detail: settings }));
      setStatus(strings.saved);
    } catch {
      setStatus(strings.saveFailed, 'error');
    }
  }

  async function updateDefaultModel(value) {
    try {
      const defaultModel = decodeModelValue(value);
      settings = await invokeIpc('app-settings:save', { defaultModel });
      window.dispatchEvent(new CustomEvent('joanium:app-settings-changed', { detail: settings }));
      setStatus(strings.saved);
    } catch {
      setStatus(strings.saveFailed, 'error');
    }
  }

  async function populate() {
    // Fetch app settings and provider catalog in parallel.
    const [nextSettings, bootstrap] = await Promise.all([
      invokeIpc('app-settings:get'),
      invokeIpc('chat:bootstrap').catch(() => ({ providers: [], user: {} })),
    ]);

    settings = nextSettings;
    autoUpdateState = settings.autoUpdateState ?? null;
    resetConfirming = false;
    options.replaceChildren();
    runtime.replaceChildren();
    danger.replaceChildren();
    languageDropdown?.dispose();
    languageDropdown = null;
    defaultViewDropdown?.dispose();
    defaultViewDropdown = null;
    defaultModelDropdown?.dispose();
    defaultModelDropdown = null;

    languageDropdown = createDropDown({
      label: '',
      options: strings.language.options,
      selectedValue: settings.locale ?? 'en',
      onChange: (value) => {
        void updateLanguage(value);
      },
    });

    const languageRow = createElement('div', 'app-settings__dropdown-row');
    const languageMeta = createElement('div', 'app-settings__dropdown-meta');
    languageMeta.append(
      createElement('span', 'app-settings__dropdown-label', strings.language.label),
      createElement('span', 'app-settings__dropdown-desc', strings.language.description),
    );
    languageRow.append(languageMeta, languageDropdown.element);
    options.append(languageRow);

    // ── Default view row ───────────────────────────────────────────────────
    const viewOptions = Object.entries(strings.defaultView.views).map(([value, label]) => ({
      value,
      label,
    }));
    defaultViewDropdown = createDropDown({
      label: '',
      options: viewOptions,
      selectedValue: settings.defaultView ?? 'chat',
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
    const modelOptions = buildModelOptions(providers, userProviderDetails);

    // Pre-select: use the saved preference if present, otherwise fall back to
    // the first available model so something sensible is always shown.
    const savedModelValue = encodeModelValue(settings.defaultModel);
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

    // ── Boolean toggles ───────────────────────────────────────────────────
    for (const key of OPTION_KEYS) {
      const option = strings.options[key];
      const checkbox = createCheckbox({
        label: option.label,
        description: option.description,
        checked: Boolean(settings[key]),
        onChange: (checked) => {
          void updateSetting(key, checked, checkbox.element);
        },
      });
      options.append(checkbox.element);
    }

    // ── Manual memory update card (only shown when autoMemoryUpdates is off) ──
    const memoryCard = createElement('div', 'app-settings__memory-card');
    memoryCard.hidden = Boolean(settings.autoMemoryUpdates);

    const memoryMeta = createElement('div', 'app-settings__dropdown-meta');
    const memoryLabel = createElement(
      'span',
      'app-settings__dropdown-label',
      strings.updateMemory.label,
    );
    const memoryDesc = createElement(
      'span',
      'app-settings__dropdown-desc',
      strings.updateMemory.description,
    );
    memoryMeta.append(memoryLabel, memoryDesc);

    const memoryBtn = createElement(
      'button',
      'app-settings__memory-btn',
      strings.updateMemory.button,
    );
    memoryBtn.type = 'button';
    memoryBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('joanium:trigger-memory-sync'));
      memoryBtn.disabled = true;
      memoryBtn.textContent = strings.updateMemory.updating;

      // Reset the button once the sync finishes (indicator fires active: false).
      let fallbackTimer = null;
      const onSyncEnd = (event) => {
        if (event.detail?.active) return;
        window.removeEventListener('joanium:memory-sync', onSyncEnd);
        clearTimeout(fallbackTimer);
        memoryBtn.disabled = false;
        memoryBtn.textContent = strings.updateMemory.button;
      };
      window.addEventListener('joanium:memory-sync', onSyncEnd);
      // Fallback in case there are no pending sessions (sync completes silently).
      fallbackTimer = setTimeout(() => {
        window.removeEventListener('joanium:memory-sync', onSyncEnd);
        memoryBtn.disabled = false;
        memoryBtn.textContent = strings.updateMemory.button;
      }, 30000);
    });

    memoryCard.append(memoryMeta, memoryBtn);
    options.append(memoryCard);

    runtime.append(createElement('h3', 'app-settings__runtime-title', strings.runtime.title));

    const keepAwakeRow = createElement('div', 'app-settings__runtime-row');
    keepAwakeRow.append(
      createElement('span', '', strings.runtime.keepAwake),
      createElement(
        'strong',
        '',
        settings.keepAwakeActive ? strings.runtime.active : strings.runtime.inactive,
      ),
    );

    const trayRow = createElement('div', 'app-settings__runtime-row');
    trayRow.append(
      createElement('span', '', strings.runtime.tray),
      createElement(
        'strong',
        '',
        settings.trayActive ? strings.runtime.active : strings.runtime.inactive,
      ),
    );

    const updateRow = createElement(
      'div',
      'app-settings__runtime-row app-settings__runtime-row--update',
    );
    const updateCopy = createElement('div', 'app-settings__runtime-copy');
    autoUpdateStatusEl = createElement('strong', 'app-settings__runtime-update-status');
    autoUpdateDetailEl = createElement('span', 'app-settings__runtime-update-detail');
    updateCopy.append(
      createElement('span', 'app-settings__runtime-update-label', strings.autoUpdate.label),
      autoUpdateStatusEl,
      autoUpdateDetailEl,
    );
    const updateActions = createElement('div', 'app-settings__runtime-actions');
    autoUpdateCheckBtn = createElement(
      'button',
      'app-settings__runtime-btn',
      strings.autoUpdate.check,
    );
    autoUpdateCheckBtn.type = 'button';
    autoUpdateCheckBtn.addEventListener('click', async () => {
      autoUpdateCheckBtn.disabled = true;
      autoUpdateCheckBtn.textContent = strings.autoUpdate.checking;
      const state = await invokeIpc('auto-update:check').catch(() => null);
      if (state) syncAutoUpdateRuntime(state);
      else setStatus(strings.autoUpdate.checkFailed, 'error');
    });
    autoUpdateInstallBtn = createElement(
      'button',
      'app-settings__runtime-btn app-settings__runtime-btn--primary',
      strings.autoUpdate.install,
    );
    autoUpdateInstallBtn.type = 'button';
    autoUpdateInstallBtn.hidden = true;
    autoUpdateInstallBtn.addEventListener('click', () => {
      void invokeIpc('auto-update:install');
    });
    updateActions.append(autoUpdateCheckBtn, autoUpdateInstallBtn);
    updateRow.append(updateCopy, updateActions);

    runtime.append(keepAwakeRow, trayRow, updateRow);
    syncAutoUpdateRuntime(autoUpdateState);

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
        setStatus(strings.reset.failed, 'error');
      }
    });
    resetRow.append(resetMeta, resetButton);
    danger.append(resetRow);

    // Keep the card in sync when autoMemoryUpdates is toggled this session.
    function syncMemoryCard() {
      memoryCard.hidden = Boolean(settings?.autoMemoryUpdates);
    }
    window.addEventListener('joanium:app-settings-changed', (event) => {
      settings = event.detail ?? settings;
      syncMemoryCard();
      syncAutoUpdateRuntime(settings?.autoUpdateState ?? autoUpdateState);
    });
  }

  const disposeAutoUpdateState = onIpc('auto-update:state', (state) => {
    syncAutoUpdateRuntime(state);
  });
  const disposeAutoUpdateProgress = onIpc('auto-update:download-progress', (progress) => {
    syncAutoUpdateRuntime({
      ...(autoUpdateState ?? {}),
      status: 'downloading',
      progress,
    });
  });
  view._dispose = () => {
    clearTimeout(resetConfirmTimer);
    languageDropdown?.dispose();
    defaultViewDropdown?.dispose();
    defaultModelDropdown?.dispose();
    disposeAutoUpdateState?.();
    disposeAutoUpdateProgress?.();
  };

  view.append(options, runtime, danger, status);
  void populate().catch(() => setStatus(strings.saveFailed, 'error'));
  return view;
}
