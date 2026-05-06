import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createInputBoxLite } from '../../Shared/InputBoxLite/InputBoxLite.js';
import { createDropDownLite } from '../../Shared/DropDownLite/DropDownLite.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function showFeedback(el, text, isError = false) {
  el.textContent = text;
  el.className   = isError
    ? 'security-panel__feedback security-panel__feedback--error'
    : 'security-panel__feedback security-panel__feedback--ok';
  el.hidden = !text;
}

function clearFeedback(el) {
  el.textContent = '';
  el.hidden      = true;
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Status badge ──────────────────────────────────────────────────────────────

function buildStatusBadge(enabled, strings) {
  const badge  = createElement('div',
    `security-panel__status-badge${enabled ? ' security-panel__status-badge--on' : ''}`
  );
  const dot    = createElement('span', 'security-panel__status-dot');
  const textEl = createElement('span', 'security-panel__status-text',
    enabled ? strings.statusEnabled : strings.statusDisabled
  );
  badge.append(dot, textEl);
  return badge;
}

// ── Timeout options ──────────────────────────────────────────────────────────

const TIMEOUT_OPTIONS = [
  { value: 'never', labelKey: 'autoLockNever' },
  { value: '1min',  labelKey: 'autoLock1Min'  },
  { value: '5min',  labelKey: 'autoLock5Min'  },
  { value: '10min', labelKey: 'autoLock10Min' },
  { value: '15min', labelKey: 'autoLock15Min' },
  { value: '30min', labelKey: 'autoLock30Min' },
  { value: '1hr',   labelKey: 'autoLock1Hr'   },
];

// ── Main export ───────────────────────────────────────────────────────────────

export function createSecurityPanel(strings, { onSecurityChanged } = {}) {
  const view = createElement('div', 'security-panel');

  const titleEl    = createElement('h2', 'security-panel__title', strings.title);
  const subtitleEl = createElement('p',  'security-panel__subtitle', strings.subtitle);
  view.append(titleEl, subtitleEl);

  const body = createElement('div', 'security-panel__body');
  view.append(body);

  // ── Disabled state ────────────────────────────────────────────────────────

  function renderDisabled() {
    body.replaceChildren();

    // Top card — status + description + enable button
    const topCard   = createElement('div', 'security-panel__card');
    const badge     = buildStatusBadge(false, strings);
    const desc      = createElement('p', 'security-panel__desc', strings.statusDisabledDesc);
    const enableBtn = createElement('button', 'security-panel__btn security-panel__btn--primary', strings.enableBtn);
    enableBtn.type  = 'button';
    topCard.append(badge, desc, enableBtn);
    body.append(topCard);

    // Inline enable form (shown in a separate card below)
    const formCard  = createElement('div', 'security-panel__card security-panel__card--form');
    formCard.hidden = true;

    const formTitle   = createElement('p', 'security-panel__form-title', strings.setupTitle);
    const passwordBox = createInputBoxLite({ label: strings.newPasswordLabel,     placeholder: strings.newPasswordPlaceholder,     type: 'password' });
    const confirmBox  = createInputBoxLite({ label: strings.confirmPasswordLabel,  placeholder: strings.confirmPasswordPlaceholder,  type: 'password' });
    const questionBox = createInputBoxLite({ label: strings.secretQuestionLabel,   placeholder: strings.secretQuestionPlaceholder,   type: 'text'     });
    const answerBox   = createInputBoxLite({ label: strings.secretAnswerLabel,     placeholder: strings.secretAnswerPlaceholder,     type: 'password' });

    const feedback  = createElement('p', 'security-panel__feedback');
    feedback.hidden = true;

    const formActions = createElement('div', 'security-panel__form-actions');
    const submitBtn   = createElement('button', 'security-panel__btn security-panel__btn--primary', strings.enableConfirmBtn);
    submitBtn.type    = 'button';
    const cancelBtn   = createElement('button', 'security-panel__btn security-panel__btn--ghost',   strings.cancelBtn);
    cancelBtn.type    = 'button';
    formActions.append(submitBtn, cancelBtn);

    formCard.append(formTitle, passwordBox.element, confirmBox.element, questionBox.element, answerBox.element, feedback, formActions);
    body.append(formCard);

    // Show form
    enableBtn.addEventListener('click', () => {
      formCard.hidden  = false;
      enableBtn.hidden = true;
      requestAnimationFrame(() => passwordBox.input.focus());
    });

    // Hide form
    cancelBtn.addEventListener('click', () => {
      formCard.hidden  = true;
      enableBtn.hidden = false;
      passwordBox.input.value = '';
      confirmBox.input.value  = '';
      questionBox.input.value = '';
      answerBox.input.value   = '';
      clearFeedback(feedback);
    });

    // Submit
    submitBtn.addEventListener('click', async () => {
      const password = passwordBox.input.value;
      const confirm  = confirmBox.input.value;
      const question = questionBox.input.value.trim();
      const answer   = answerBox.input.value.trim();

      if (password.length < 6) { showFeedback(feedback, strings.errorPasswordTooShort, true); return; }
      if (password !== confirm)  { showFeedback(feedback, strings.errorPasswordMismatch,  true); return; }
      if (!question)             { showFeedback(feedback, strings.errorMissingQuestion,   true); return; }
      if (!answer)               { showFeedback(feedback, strings.errorMissingAnswer,     true); return; }

      submitBtn.disabled = true;
      clearFeedback(feedback);

      try {
        const result = await invokeIpc('security:enable', password, question, answer);
        if (result.success) {
          renderEnabled();
          onSecurityChanged?.();
        } else {
          showFeedback(feedback, strings[`error${capitalise(result.error)}`] ?? strings.errorGeneric, true);
        }
      } catch {
        showFeedback(feedback, strings.errorGeneric, true);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ── Enabled state ─────────────────────────────────────────────────────────
  // Single card containing: status badge, description, two-button row.
  // Clicking a button hides the button row and expands an inline form
  // inside the same card. Cancel collapses back to the button row.

  function renderEnabled() {
    body.replaceChildren();

    const card = createElement('div', 'security-panel__card');

    const badge = buildStatusBadge(true, strings);
    const desc  = createElement('p', 'security-panel__desc', strings.statusEnabledDesc);

    // ── Button row ────────────────────────────────────────────────────────
    const btnRow     = createElement('div', 'security-panel__btn-row');
    const changeBtn  = createElement('button', 'security-panel__btn security-panel__btn--secondary', strings.changePasswordBtn);
    changeBtn.type   = 'button';
    const disableBtn = createElement('button', 'security-panel__btn security-panel__btn--danger', strings.disableBtn);
    disableBtn.type  = 'button';
    btnRow.append(changeBtn, disableBtn);

    // ── Change-password inline form ───────────────────────────────────────
    const changeForm    = createElement('div', 'security-panel__inline-form');
    changeForm.hidden   = true;
    const changeTitle   = createElement('p', 'security-panel__form-title', strings.changeTitle);
    const currentBoxC   = createInputBoxLite({ label: strings.currentPasswordLabel, placeholder: strings.currentPasswordPlaceholder, type: 'password' });
    const newBoxC       = createInputBoxLite({ label: strings.newPasswordLabel,     placeholder: strings.newPasswordPlaceholder,     type: 'password' });
    const confirmBoxC   = createInputBoxLite({ label: strings.confirmPasswordLabel, placeholder: strings.confirmPasswordPlaceholder, type: 'password' });
    const changeFeedback = createElement('p', 'security-panel__feedback');
    changeFeedback.hidden = true;
    const changeActions  = createElement('div', 'security-panel__form-actions');
    const changeSubmit   = createElement('button', 'security-panel__btn security-panel__btn--primary', strings.changeConfirmBtn);
    changeSubmit.type    = 'button';
    const changeCancelBtn = createElement('button', 'security-panel__btn security-panel__btn--ghost', strings.cancelBtn);
    changeCancelBtn.type  = 'button';
    changeActions.append(changeSubmit, changeCancelBtn);
    changeForm.append(changeTitle, currentBoxC.element, newBoxC.element, confirmBoxC.element, changeFeedback, changeActions);

    // ── Disable inline form ───────────────────────────────────────────────
    const disableForm    = createElement('div', 'security-panel__inline-form');
    disableForm.hidden   = true;
    const disableTitle   = createElement('p', 'security-panel__form-title', strings.disableTitle);
    const disableDesc    = createElement('p', 'security-panel__form-desc',  strings.disableDesc);
    const currentBoxD    = createInputBoxLite({ label: strings.currentPasswordLabel, placeholder: strings.currentPasswordPlaceholder, type: 'password' });
    const disableFeedback = createElement('p', 'security-panel__feedback');
    disableFeedback.hidden = true;
    const disableActions  = createElement('div', 'security-panel__form-actions');
    const disableSubmit   = createElement('button', 'security-panel__btn security-panel__btn--danger', strings.disableConfirmBtn);
    disableSubmit.type    = 'button';
    const disableCancelBtn = createElement('button', 'security-panel__btn security-panel__btn--ghost', strings.cancelBtn);
    disableCancelBtn.type  = 'button';
    disableActions.append(disableSubmit, disableCancelBtn);
    disableForm.append(disableTitle, disableDesc, currentBoxD.element, disableFeedback, disableActions);

    // ── Toggle helpers ────────────────────────────────────────────────────

    function showBtnRow() {
      btnRow.hidden       = false;
      changeForm.hidden   = true;
      disableForm.hidden  = true;
      currentBoxC.input.value = '';
      newBoxC.input.value     = '';
      confirmBoxC.input.value = '';
      currentBoxD.input.value = '';
      clearFeedback(changeFeedback);
      clearFeedback(disableFeedback);
    }

    changeBtn.addEventListener('click', () => {
      btnRow.hidden      = true;
      changeForm.hidden  = false;
      disableForm.hidden = true;
      requestAnimationFrame(() => currentBoxC.input.focus());
    });

    disableBtn.addEventListener('click', () => {
      btnRow.hidden      = true;
      disableForm.hidden = false;
      changeForm.hidden  = true;
      requestAnimationFrame(() => currentBoxD.input.focus());
    });

    changeCancelBtn.addEventListener('click', showBtnRow);
    disableCancelBtn.addEventListener('click', showBtnRow);

    // ── Change password submit ────────────────────────────────────────────

    changeSubmit.addEventListener('click', async () => {
      const current = currentBoxC.input.value;
      const newPw   = newBoxC.input.value;
      const confirm = confirmBoxC.input.value;

      if (newPw.length < 6)    { showFeedback(changeFeedback, strings.errorPasswordTooShort, true); return; }
      if (newPw !== confirm)    { showFeedback(changeFeedback, strings.errorPasswordMismatch,  true); return; }

      changeSubmit.disabled = true;
      clearFeedback(changeFeedback);

      try {
        const result = await invokeIpc('security:change-password', current, newPw);
        if (result.success) {
          showFeedback(changeFeedback, strings.successPasswordChanged, false);
          setTimeout(() => renderEnabled(), 1200);
        } else {
          showFeedback(changeFeedback, strings[`error${capitalise(result.error)}`] ?? strings.errorGeneric, true);
        }
      } catch {
        showFeedback(changeFeedback, strings.errorGeneric, true);
      } finally {
        changeSubmit.disabled = false;
      }
    });

    // ── Disable submit ────────────────────────────────────────────────────

    disableSubmit.addEventListener('click', async () => {
      const current = currentBoxD.input.value;

      disableSubmit.disabled = true;
      clearFeedback(disableFeedback);

      try {
        const result = await invokeIpc('security:disable', current);
        if (result.success) {
          renderDisabled();
          onSecurityChanged?.();
        } else {
          showFeedback(disableFeedback, strings[`error${capitalise(result.error)}`] ?? strings.errorGeneric, true);
        }
      } catch {
        showFeedback(disableFeedback, strings.errorGeneric, true);
      } finally {
        disableSubmit.disabled = false;
      }
    });

    card.append(badge, desc, btnRow, changeForm, disableForm);
    body.append(card);

    // ── Auto-lock timeout card ─────────────────────────────────────────────

    const autoLockCard   = createElement('div', 'security-panel__card');
    const autoLockRow    = createElement('div', 'security-panel__setting-row');
    const autoLockText   = createElement('div', 'security-panel__setting-text');
    const autoLockLabel  = createElement('p', 'security-panel__setting-label', strings.autoLockLabel);
    const autoLockDesc   = createElement('p', 'security-panel__setting-desc',  strings.autoLockDesc);
    autoLockText.append(autoLockLabel, autoLockDesc);

    const timeoutSelect = createDropDownLite({
      options: TIMEOUT_OPTIONS.map((opt) => ({ value: opt.value, label: strings[opt.labelKey] })),
      placeholder: strings.autoLockNever,
      onChange: async (val) => {
        try {
          await invokeIpc('security:set-auto-lock-timeout', val);
          onSecurityChanged?.();
        } catch {
          // Non-fatal.
        }
      }
    });

    invokeIpc('security:get-auto-lock-timeout')
      .then((current) => { timeoutSelect.setValue(current ?? 'never'); })
      .catch(() => { timeoutSelect.setValue('never'); });

    autoLockRow.append(autoLockText, timeoutSelect.element);
    autoLockCard.append(autoLockRow);
    body.append(autoLockCard);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  invokeIpc('security:get-status')
    .then((status) => {
      if (status.enabled) {
        renderEnabled();
      } else {
        renderDisabled();
      }
    })
    .catch(() => {
      renderDisabled();
    });

  return view;
}
