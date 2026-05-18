import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';
import { createSettingsPanelState } from './Utils.js';

export function createMemorySettingsPanel(strings) {
  const view = createElement('div', 'app-settings');
  const options = createElement('div', 'app-settings__options');
  const status = createElement('p', 'app-settings__status');
  const state = createSettingsPanelState({ status, strings });
  let disposed = false;
  let memorySyncCleanup = null;
  let removeSettingsChangeListener = null;

  function clearMemorySyncWait() {
    memorySyncCleanup?.();
    memorySyncCleanup = null;
  }

  async function populate() {
    state.setSettings(await invokeIpc('app-settings:get'));
    if (disposed) {
      return;
    }

    options.replaceChildren();

    // ── Auto memory updates toggle ─────────────────────────────────────────
    const option = strings.options.autoMemoryUpdates;
    const checkbox = createCheckbox({
      label: option.label,
      description: option.description,
      checked: Boolean(state.settings.autoMemoryUpdates),
      onChange: async (checked) => {
        await state.updateSetting('autoMemoryUpdates', checked, checkbox.element);
        memoryCard.hidden = Boolean(state.settings?.autoMemoryUpdates);
      },
    });
    options.append(checkbox.element);

    // ── Update memory now card ─────────────────────────────────────────────
    const memoryCard = createElement('div', 'app-settings__memory-card');
    memoryCard.hidden = Boolean(state.settings.autoMemoryUpdates);

    const memoryMeta = createElement('div', 'app-settings__dropdown-meta');
    memoryMeta.append(
      createElement('span', 'app-settings__dropdown-label', strings.updateMemory.label),
      createElement('span', 'app-settings__dropdown-desc', strings.updateMemory.description),
    );

    const memoryBtn = createElement(
      'button',
      'app-settings__memory-btn',
      strings.updateMemory.button,
    );
    memoryBtn.type = 'button';
    memoryBtn.addEventListener('click', () => {
      clearMemorySyncWait();
      window.dispatchEvent(new CustomEvent('joanium:trigger-memory-sync'));
      memoryBtn.disabled = true;
      memoryBtn.textContent = strings.updateMemory.updating;

      let fallbackTimer = null;
      const resetMemoryButton = () => {
        if (disposed) return;
        memoryBtn.disabled = false;
        memoryBtn.textContent = strings.updateMemory.button;
      };
      const onSyncEnd = (event) => {
        if (event.detail?.active) return;
        clearMemorySyncWait();
        resetMemoryButton();
      };
      window.addEventListener('joanium:memory-sync', onSyncEnd);
      memorySyncCleanup = () => {
        window.removeEventListener('joanium:memory-sync', onSyncEnd);
        clearTimeout(fallbackTimer);
      };
      fallbackTimer = setTimeout(() => {
        clearMemorySyncWait();
        resetMemoryButton();
      }, 30000);
    });

    memoryCard.append(memoryMeta, memoryBtn);
    options.append(memoryCard);

    // Keep card in sync when the toggle is changed elsewhere in the same session.
    const onSettingsChanged = (event) => {
      if (disposed) return;
      state.setSettings(event.detail ?? state.settings);
      memoryCard.hidden = Boolean(state.settings?.autoMemoryUpdates);
    };
    window.addEventListener('joanium:app-settings-changed', onSettingsChanged);
    removeSettingsChangeListener = () => {
      window.removeEventListener('joanium:app-settings-changed', onSettingsChanged);
    };
  }

  view._dispose = () => {
    disposed = true;
    clearMemorySyncWait();
    removeSettingsChangeListener?.();
    removeSettingsChangeListener = null;
  };

  view.append(options, status);
  void populate().catch(() => state.setStatus(strings.saveFailed, 'error'));
  return view;
}
