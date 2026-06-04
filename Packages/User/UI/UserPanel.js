import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createInputBoxLite } from '../../Shared/InputBoxLite/InputBoxLite.js';
import { iconMarkup } from '../../Shared/Icons/Icons.js';
import { toFileUrl } from '../../Shared/Utils/UrlUtils.js';

export function createUserPanel(strings, { getProfile, onProfileSaved, onAvatarChanged }) {
  let draft = createDraft(getProfile());
  let draftInstructions = '';
  const view = createElement('div', 'chat-settings__user');

  // ── Avatar section ────────────────────────────────────────────────────────

  const avatarSection = createElement('div', 'chat-settings__avatar-section');

  const avatarPreview = createElement('div', 'chat-settings__avatar-preview');

  let currentAvatarPath = getProfile()?.avatarPath ?? null;

  function renderAvatarPreview() {
    avatarPreview.replaceChildren();
    if (currentAvatarPath) {
      const img = createElement('img', 'chat-settings__avatar-preview-img');
      img.src = toFileUrl(currentAvatarPath) + '?t=' + Date.now();
      img.alt = '';
      avatarPreview.append(img);
    } else {
      const iconEl = createElement('span', 'chat-settings__avatar-preview-icon');
      iconEl.innerHTML = iconMarkup.tabPersonas;
      avatarPreview.append(iconEl);
    }
  }

  renderAvatarPreview();

  const avatarBtns = createElement('div', 'chat-settings__avatar-btns');

  const uploadBtn = createElement('button', 'chat-settings__avatar-upload-btn');
  uploadBtn.type = 'button';

  function refreshUploadBtnLabel() {
    uploadBtn.textContent = currentAvatarPath ? strings.changeAvatar : strings.uploadAvatar;
  }
  refreshUploadBtnLabel();

  const removeBtn = createElement('button', 'chat-settings__avatar-remove-btn');
  removeBtn.type = 'button';
  const removeBtnIcon = createElement('span', 'chat-settings__avatar-remove-btn-icon');
  removeBtnIcon.innerHTML = iconMarkup.trash ?? '';
  const removeBtnLabel = createElement('span', '', strings.removeAvatar);
  removeBtn.append(removeBtnIcon, removeBtnLabel);

  function refreshRemoveBtnVisibility() {
    removeBtn.hidden = !currentAvatarPath;
  }
  refreshRemoveBtnVisibility();

  uploadBtn.addEventListener('click', async () => {
    uploadBtn.disabled = true;
    try {
      const pickedPath = await invokeIpc('user:pick-avatar');
      if (!pickedPath) return;

      const savedPath = await invokeIpc('user:save-avatar', pickedPath);
      currentAvatarPath = savedPath;
      renderAvatarPreview();
      refreshUploadBtnLabel();
      refreshRemoveBtnVisibility();
      onAvatarChanged?.(savedPath);
    } catch (err) {
      console.error('[Joanium] Failed to save avatar:', err);
    } finally {
      uploadBtn.disabled = false;
    }
  });

  removeBtn.addEventListener('click', async () => {
    removeBtn.disabled = true;
    try {
      await invokeIpc('user:remove-avatar');
      currentAvatarPath = null;
      renderAvatarPreview();
      refreshUploadBtnLabel();
      refreshRemoveBtnVisibility();
      onAvatarChanged?.(null);
    } catch (err) {
      console.error('[Joanium] Failed to remove avatar:', err);
    } finally {
      removeBtn.disabled = false;
    }
  });

  const avatarHint = createElement('p', 'chat-settings__avatar-hint', strings.avatarHint);

  const avatarCardBody = createElement('div', 'chat-settings__avatar-card-body');
  avatarCardBody.append(avatarBtns, avatarHint);

  const avatarCard = createElement('div', 'chat-settings__avatar-card');
  avatarCard.append(avatarPreview, avatarCardBody);

  avatarBtns.append(uploadBtn, removeBtn);
  const avatarHeading = createElement(
    'p',
    'chat-settings__field-label',
    strings.avatarLabel ?? 'Profile Picture',
  );
  avatarSection.append(avatarHeading, avatarCard);

  // ── Name ──────────────────────────────────────────────────────────────────

  const nameBox = createInputBoxLite({
    label: strings.nameLabel,
    value: draft.name,
    placeholder: strings.namePlaceholder,
    onInput: (value) => {
      draft.name = value;
    },
  });

  // ── Date of Birth ─────────────────────────────────────────────────────────

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

  const instructionsLabel = createElement(
    'label',
    'chat-settings__field-label',
    strings.instructionsLabel,
  );
  const instructionsTextarea = createElement('textarea', 'chat-settings__instructions-textarea');
  instructionsTextarea.placeholder = strings.instructionsPlaceholder;
  instructionsTextarea.setAttribute('aria-label', strings.instructionsLabel);
  instructionsTextarea.addEventListener('input', () => {
    draftInstructions = instructionsTextarea.value;
  });

  void invokeIpc('user:get-custom-instructions')
    .then((value) => {
      draftInstructions = value ?? '';
      instructionsTextarea.value = draftInstructions;
    })
    .catch(() => {});

  // ── Save ──────────────────────────────────────────────────────────────────

  const status = createElement('p', 'chat-settings__save-status', '');
  const saveBtn = createElement('button', 'chat-settings__save-btn', strings.save);
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = strings.saving;
    status.textContent = '';

    try {
      const [savedProfile] = await Promise.all([
        invokeIpc('user:save-profile', {
          name: draft.name.trim(),
          dateOfBirth: {
            day: draft.day,
            month: draft.month,
            year: draft.year,
          },
        }),
        invokeIpc('user:save-custom-instructions', draftInstructions),
      ]);

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

  const leftCol = createElement('div', 'chat-settings__user-left');
  leftCol.append(avatarSection, nameBox.element, dobLabel, dobRow, actions);

  const rightCol = createElement('div', 'chat-settings__user-right');
  rightCol.append(instructionsLabel, instructionsTextarea);

  const cols = createElement('div', 'chat-settings__user-cols');
  cols.append(leftCol, rightCol);

  view.append(cols);
  return view;
}

function createDraft(profile) {
  const dateOfBirth = profile?.dateOfBirth ?? {};
  return {
    name: profile?.name ?? '',
    day: dateOfBirth.day ?? '',
    month: dateOfBirth.month ?? '',
    year: dateOfBirth.year ?? '',
  };
}

function createDateBox(placeholder, maxLength, onChange) {
  const box = createInputBoxLite({
    placeholder,
    inputMode: 'numeric',
    maxLength,
    onInput: (value) => {
      const cleaned = value.replace(/\D/g, '').slice(0, maxLength);
      onChange(cleaned);
      if (box.input.value !== cleaned) {
        box.input.value = cleaned;
      }
    },
  });

  return box;
}
