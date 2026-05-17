import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(ms) {
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function toFileUrl(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

function makeLockSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = `
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  `;
  return svg;
}

/** Shakes an input to signal a wrong attempt — restarts cleanly if re-triggered. */
function shake(el) {
  el.classList.remove('lock-screen__input--shake');
  void el.offsetWidth; // force reflow so animation restarts
  el.classList.add('lock-screen__input--shake');
  el.addEventListener('animationend', () => el.classList.remove('lock-screen__input--shake'), {
    once: true,
  });
}

// ── Lock screen ───────────────────────────────────────────────────────────────
// Returns a Promise that resolves once the correct password (or secret answer)
// has been verified by the main process. The overlay removes itself from the
// DOM before the promise resolves.

export function mountLockScreen(strings, initialStatus) {
  return new Promise((resolve) => {
    let countdownInterval = null;

    // ── Overlay ───────────────────────────────────────────────────────────
    const overlay = createElement('div', 'lock-screen');
    const card = createElement('div', 'lock-screen__card');

    // ── Avatar ────────────────────────────────────────────────────────────
    const avatar = createElement('div', 'lock-screen__avatar');

    function renderAvatar(avatarPath) {
      avatar.replaceChildren();
      if (avatarPath) {
        const img = createElement('img', 'lock-screen__avatar-img');
        img.src = toFileUrl(avatarPath) + '?t=' + Date.now();
        img.alt = '';
        avatar.classList.add('lock-screen__avatar--photo');
        avatar.append(img);
      } else {
        avatar.classList.remove('lock-screen__avatar--photo');
        avatar.append(makeLockSvg());
      }
    }

    renderAvatar(null);

    // ── Name + subtitle ───────────────────────────────────────────────────
    const nameEl = createElement('h1', 'lock-screen__name', 'Joanium');
    const subtitleEl = createElement('p', 'lock-screen__subtitle', strings.lockSubtitle);

    invokeIpc('user:get-profile')
      .then((profile) => {
        renderAvatar(profile?.avatarPath ?? null);
        if (profile?.name?.trim()) {
          nameEl.textContent = profile.name.trim();
        }
      })
      .catch(() => {});

    // ── Guest mode ────────────────────────────────────────────────────────
    // When security is not configured, show a lightweight lock that unlocks
    // on any keypress — no password needed.
    if (initialStatus.guestMode) {
      subtitleEl.textContent = strings.lockGuestSubtitle ?? 'App is locked';

      const hintEl = createElement(
        'p',
        'lock-screen__subtitle',
        strings.lockGuestHint ?? 'Press any key to unlock',
      );
      hintEl.style.opacity = '0.5';

      card.append(avatar, nameEl, subtitleEl, hintEl);
      overlay.append(card);
      document.body.append(overlay);

      function dismiss() {
        document.removeEventListener('keydown', onKey, { capture: true });
        overlay.classList.add('lock-screen--leaving');
        overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
      }

      function onKey() {
        dismiss();
        resolve();
      }

      // Small delay so the keydown that triggered /lock doesn't immediately
      // dismiss the screen.
      setTimeout(() => {
        document.addEventListener('keydown', onKey, { capture: true, once: true });
      }, 300);

      return;
    }

    // ── Rate-limit banner ─────────────────────────────────────────────────
    const rateLimitBanner = createElement('div', 'lock-screen__rate-limit');
    rateLimitBanner.hidden = true;

    function startCountdown(lockedUntil) {
      clearInterval(countdownInterval);
      rateLimitBanner.hidden = false;

      function tick() {
        const remaining = lockedUntil - Date.now();
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          rateLimitBanner.hidden = true;
          unlockBtn.disabled = false;
          answerBtn.disabled = false;
          return;
        }
        rateLimitBanner.textContent = strings.lockRateLimitMsg.replace(
          '{time}',
          formatCountdown(remaining),
        );
        unlockBtn.disabled = true;
        answerBtn.disabled = true;
      }

      tick();
      countdownInterval = setInterval(tick, 500);
    }

    // ── Password section ──────────────────────────────────────────────────
    const passwordSection = createElement('div', 'lock-screen__section');

    const passwordWrap = createElement('div', 'lock-screen__input-wrap');
    const passwordInput = createElement('input', 'lock-screen__input');
    passwordInput.type = 'password';
    passwordInput.placeholder = strings.lockPasswordPlaceholder;
    passwordInput.autocomplete = 'current-password';
    passwordWrap.append(passwordInput);

    const passwordError = createElement('p', 'lock-screen__error');
    passwordError.hidden = true;

    const unlockBtn = createElement(
      'button',
      'lock-screen__btn lock-screen__btn--primary',
      strings.lockUnlockBtn,
    );
    unlockBtn.type = 'button';

    const forgotBtn = createElement(
      'button',
      'lock-screen__btn lock-screen__btn--ghost',
      strings.lockForgotBtn,
    );
    forgotBtn.type = 'button';

    passwordSection.append(passwordWrap, passwordError, unlockBtn, forgotBtn);

    // ── Secret-question section ───────────────────────────────────────────
    const answerSection = createElement('div', 'lock-screen__section');

    const questionBlock = createElement('div', 'lock-screen__question-block');
    const questionEyebrow = createElement('p', 'lock-screen__question-eyebrow', 'Secret question');
    const questionLabel = createElement(
      'p',
      'lock-screen__question-label',
      initialStatus.secretQuestion ?? '',
    );
    questionBlock.append(questionEyebrow, questionLabel);

    const answerWrap = createElement('div', 'lock-screen__input-wrap');
    const answerInput = createElement('input', 'lock-screen__input');
    answerInput.type = 'text';
    answerInput.placeholder = strings.lockAnswerPlaceholder;
    answerWrap.append(answerInput);

    const answerError = createElement('p', 'lock-screen__error');
    answerError.hidden = true;

    const answerBtn = createElement(
      'button',
      'lock-screen__btn lock-screen__btn--primary',
      strings.lockAnswerBtn,
    );
    answerBtn.type = 'button';

    const backBtn = createElement(
      'button',
      'lock-screen__btn lock-screen__btn--ghost',
      strings.lockBackBtn,
    );
    backBtn.type = 'button';

    answerSection.append(questionBlock, answerWrap, answerError, answerBtn, backBtn);
    answerSection.hidden = true;

    // ── Section transitions ───────────────────────────────────────────────

    forgotBtn.addEventListener('click', () => {
      passwordSection.hidden = true;
      answerSection.hidden = false;
      subtitleEl.hidden = true;
      passwordError.hidden = true;
      answerInput.value = '';
      answerError.hidden = true;
      requestAnimationFrame(() => answerInput.focus());
    });

    backBtn.addEventListener('click', () => {
      answerSection.hidden = true;
      passwordSection.hidden = false;
      subtitleEl.hidden = false;
      answerError.hidden = true;
      passwordInput.value = '';
      passwordError.hidden = true;
      requestAnimationFrame(() => passwordInput.focus());
    });

    // ── Unlock via password ───────────────────────────────────────────────

    async function attemptPassword() {
      const pw = passwordInput.value;
      if (!pw) {
        shake(passwordInput);
        return;
      }

      unlockBtn.disabled = true;
      passwordError.hidden = true;

      try {
        const result = await invokeIpc('security:verify-password', pw);

        if (result.success) {
          dismiss();
          resolve();
          return;
        }

        if (result.locked && result.lockedUntil) {
          startCountdown(result.lockedUntil);
        } else {
          passwordError.textContent = strings.lockWrongPassword;
          passwordError.hidden = false;
          passwordInput.value = '';
          shake(passwordInput);
          passwordInput.focus();
        }
      } catch {
        passwordError.textContent = strings.lockWrongPassword;
        passwordError.hidden = false;
        shake(passwordInput);
      } finally {
        if (rateLimitBanner.hidden) {
          unlockBtn.disabled = false;
        }
      }
    }

    unlockBtn.addEventListener('click', attemptPassword);
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptPassword();
    });

    // ── Unlock via secret answer ──────────────────────────────────────────

    async function attemptAnswer() {
      const ans = answerInput.value.trim();
      if (!ans) {
        shake(answerInput);
        return;
      }

      answerBtn.disabled = true;
      answerError.hidden = true;

      try {
        const result = await invokeIpc('security:verify-answer', ans);

        if (result.success) {
          dismiss();
          resolve();
          return;
        }

        answerError.textContent = strings.lockWrongAnswer;
        answerError.hidden = false;
        answerInput.value = '';
        shake(answerInput);
        answerInput.focus();
      } catch {
        answerError.textContent = strings.lockWrongAnswer;
        answerError.hidden = false;
        shake(answerInput);
      } finally {
        answerBtn.disabled = false;
      }
    }

    answerBtn.addEventListener('click', attemptAnswer);
    answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptAnswer();
    });

    // ── Assemble ──────────────────────────────────────────────────────────

    card.append(avatar, nameEl, subtitleEl, rateLimitBanner, passwordSection, answerSection);
    overlay.append(card);
    document.body.append(overlay);

    if (initialStatus.locked && initialStatus.lockedUntil) {
      startCountdown(initialStatus.lockedUntil);
    }

    requestAnimationFrame(() => passwordInput.focus());

    // ── Dismiss ───────────────────────────────────────────────────────────

    function dismiss() {
      clearInterval(countdownInterval);
      overlay.classList.add('lock-screen--leaving');
      overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    }
  });
}
