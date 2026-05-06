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

function makeSvg(innerHTML) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = innerHTML;
  return svg;
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
    const card    = createElement('div', 'lock-screen__card');

    // ── Avatar ────────────────────────────────────────────────────────────
    const avatar = createElement('div', 'lock-screen__avatar');
    avatar.append(makeSvg(`
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    `));

    // ── Text ──────────────────────────────────────────────────────────────
    const titleEl    = createElement('h1', 'lock-screen__title', strings.lockTitle);
    const subtitleEl = createElement('p',  'lock-screen__subtitle', strings.lockSubtitle);

    // ── Rate-limit banner ─────────────────────────────────────────────────
    const rateLimitBanner   = createElement('div', 'lock-screen__rate-limit');
    rateLimitBanner.hidden  = true;

    function startCountdown(lockedUntil) {
      clearInterval(countdownInterval);
      rateLimitBanner.hidden = false;

      function tick() {
        const remaining = lockedUntil - Date.now();
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          rateLimitBanner.hidden = true;
          unlockBtn.disabled     = false;
          answerBtn.disabled     = false;
          return;
        }
        rateLimitBanner.textContent = strings.lockRateLimitMsg.replace(
          '{time}',
          formatCountdown(remaining)
        );
        unlockBtn.disabled = true;
        answerBtn.disabled = true;
      }

      tick();
      countdownInterval = setInterval(tick, 500);
    }

    // ── Password section ──────────────────────────────────────────────────
    const passwordSection = createElement('div', 'lock-screen__section');

    const passwordWrap  = createElement('div', 'lock-screen__input-wrap');
    const passwordInput = createElement('input', 'lock-screen__input');
    passwordInput.type         = 'password';
    passwordInput.placeholder  = strings.lockPasswordPlaceholder;
    passwordInput.autocomplete = 'current-password';
    passwordWrap.append(passwordInput);

    const passwordError   = createElement('p', 'lock-screen__error');
    passwordError.hidden  = true;

    const unlockBtn = createElement('button', 'lock-screen__btn lock-screen__btn--primary', strings.lockUnlockBtn);
    unlockBtn.type  = 'button';

    const forgotBtn = createElement('button', 'lock-screen__btn lock-screen__btn--ghost', strings.lockForgotBtn);
    forgotBtn.type  = 'button';

    passwordSection.append(passwordWrap, passwordError, unlockBtn, forgotBtn);

    // ── Secret-question section ───────────────────────────────────────────
    const answerSection  = createElement('div', 'lock-screen__section');

    const questionLabel  = createElement('p', 'lock-screen__question-label',
      initialStatus.secretQuestion ?? ''
    );

    const answerWrap  = createElement('div', 'lock-screen__input-wrap');
    const answerInput = createElement('input', 'lock-screen__input');
    answerInput.type        = 'text';
    answerInput.placeholder = strings.lockAnswerPlaceholder;
    answerWrap.append(answerInput);

    const answerError   = createElement('p', 'lock-screen__error');
    answerError.hidden  = true;

    const answerBtn = createElement('button', 'lock-screen__btn lock-screen__btn--primary', strings.lockAnswerBtn);
    answerBtn.type  = 'button';

    const backBtn   = createElement('button', 'lock-screen__btn lock-screen__btn--ghost', strings.lockBackBtn);
    backBtn.type    = 'button';

    answerSection.append(questionLabel, answerWrap, answerError, answerBtn, backBtn);
    answerSection.hidden = true;

    // ── Section transitions ───────────────────────────────────────────────

    forgotBtn.addEventListener('click', () => {
      passwordSection.hidden = true;
      answerSection.hidden   = false;
      passwordError.hidden   = true;
      answerInput.value      = '';
      answerError.hidden     = true;
      requestAnimationFrame(() => answerInput.focus());
    });

    backBtn.addEventListener('click', () => {
      answerSection.hidden   = true;
      passwordSection.hidden = false;
      answerError.hidden     = true;
      passwordInput.value    = '';
      passwordError.hidden   = true;
      requestAnimationFrame(() => passwordInput.focus());
    });

    // ── Unlock via password ───────────────────────────────────────────────

    async function attemptPassword() {
      const pw = passwordInput.value;
      if (!pw) return;

      unlockBtn.disabled   = true;
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
          passwordError.hidden      = false;
          passwordInput.value       = '';
          passwordInput.focus();
        }
      } catch {
        passwordError.textContent = strings.lockWrongPassword;
        passwordError.hidden      = false;
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
      if (!ans) return;

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
        answerError.hidden      = false;
        answerInput.value       = '';
        answerInput.focus();
      } catch {
        answerError.textContent = strings.lockWrongAnswer;
        answerError.hidden      = false;
      } finally {
        answerBtn.disabled = false;
      }
    }

    answerBtn.addEventListener('click', attemptAnswer);
    answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptAnswer();
    });

    // ── Assemble ──────────────────────────────────────────────────────────

    card.append(
      avatar,
      titleEl,
      subtitleEl,
      rateLimitBanner,
      passwordSection,
      answerSection
    );
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
