import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createInputBox } from '../../Shared/InputBox/InputBox.js';

export function createUserPanel(strings, { getProfile, onProfileSaved }) {
  let draft = createDraft(getProfile());
  const view = createElement('div', 'chat-settings__user');

  const nameBox = createInputBox({
    label: strings.nameLabel,
    value: draft.name,
    placeholder: strings.namePlaceholder,
    onInput: (value) => {
      draft.name = value;
    }
  });

  const dobLabel = createElement('label', 'chat-settings__field-label', strings.dateOfBirthLabel);
  const dobRow = createElement('div', 'chat-settings__dob-row');

  const dayBox = createDateBox(strings.dayPlaceholder, 2, (value) => {
    draft.day = value;
  });
  const monthBox = createDateBox(strings.monthPlaceholder, 2, (value) => {
    draft.month = value;
  });
  const yearBox = createDateBox(strings.yearPlaceholder, 4, (value) => {
    draft.year = value;
  });

  dayBox.input.value = draft.day;
  monthBox.input.value = draft.month;
  yearBox.input.value = draft.year;
  dobRow.append(dayBox.element, monthBox.element, yearBox.element);

  const status = createElement('p', 'chat-settings__save-status', '');
  const saveBtn = createElement('button', 'chat-settings__save-btn', strings.save);
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = strings.saving;
    status.textContent = '';

    try {
      const savedProfile = await invokeIpc('user:save-profile', {
        name: draft.name.trim(),
        dateOfBirth: {
          day: draft.day,
          month: draft.month,
          year: draft.year
        }
      });

      draft = createDraft(savedProfile);
      onProfileSaved?.(savedProfile);
      status.textContent = strings.saved;
      status.className = 'chat-settings__save-status chat-settings__save-status--ok';
    } catch {
      status.textContent = strings.saveFailed;
      status.className = 'chat-settings__save-status chat-settings__save-status--err';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = strings.save;
      setTimeout(() => {
        status.textContent = '';
        status.className = 'chat-settings__save-status';
      }, 3000);
    }
  });

  const actions = createElement('div', 'chat-settings__user-actions');
  actions.append(saveBtn, status);
  view.append(nameBox.element, dobLabel, dobRow, actions);
  return view;
}

function createDraft(profile) {
  const dateOfBirth = profile?.dateOfBirth ?? {};
  return {
    name: profile?.name ?? '',
    day: dateOfBirth.day ?? '',
    month: dateOfBirth.month ?? '',
    year: dateOfBirth.year ?? ''
  };
}

function createDateBox(placeholder, maxLength, onChange) {
  const box = createInputBox({
    label: '',
    value: '',
    placeholder,
    inputMode: 'numeric',
    maxLength,
    onInput: (value) => {
      const cleaned = value.replace(/\D/g, '').slice(0, maxLength);
      onChange(cleaned);
      if (box.input.value !== cleaned) {
        box.input.value = cleaned;
      }
    }
  });

  return box;
}
