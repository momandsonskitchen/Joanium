import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';
import { createSettingsPanelState } from './Utils.js';

export function createMemorySettingsPanel(strings) {
  const view = createElement('div', 'app-settings');
  const options = createElement('div', 'app-settings__options');
  const status = createElement('p', 'app-settings__status');
  const state = createSettingsPanelState({ status, strings });

  async function populate() {
    state.setSettings(await invokeIpc('app-settings:get'));
    options.replaceChildren();

    // ── Auto memory updates toggle ─────────────────────────────────────────
    const option = strings.options.autoMemoryUpdates;
    const checkbox = createCheckbox({
      label: option.label,
      description: option.description,
      checked: Boolean(state.settings.autoMemoryUpdates),
      onChange: (checked) => {
        void state.updateSetting('autoMemoryUpdates', checked, checkbox.element);
        memoryCard.hidden = checked;
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
      window.dispatchEvent(new CustomEvent('joanium:trigger-memory-sync'));
      memoryBtn.disabled = true;
      memoryBtn.textContent = strings.updateMemory.updating;

      let fallbackTimer = null;
      const onSyncEnd = (event) => {
        if (event.detail?.active) return;
        window.removeEventListener('joanium:memory-sync', onSyncEnd);
        clearTimeout(fallbackTimer);
        memoryBtn.disabled = false;
        memoryBtn.textContent = strings.updateMemory.button;
      };
      window.addEventListener('joanium:memory-sync', onSyncEnd);
      fallbackTimer = setTimeout(() => {
        window.removeEventListener('joanium:memory-sync', onSyncEnd);
        memoryBtn.disabled = false;
        memoryBtn.textContent = strings.updateMemory.button;
      }, 30000);
    });

    memoryCard.append(memoryMeta, memoryBtn);
    options.append(memoryCard);

    // Keep card in sync when the toggle is changed elsewhere in the same session.
    window.addEventListener('joanium:app-settings-changed', (event) => {
      state.setSettings(event.detail ?? state.settings);
      memoryCard.hidden = Boolean(state.settings?.autoMemoryUpdates);
    });
  }

  view.append(options, status);
  void populate().catch(() => state.setStatus(strings.saveFailed, 'error'));
  return view;
}
