import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toFileUrl(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

function isBirthday(dateOfBirth) {
  if (!dateOfBirth?.day || !dateOfBirth?.month) return false;
  const now = new Date();
  return (
    parseInt(dateOfBirth.day, 10) === now.getDate() &&
    parseInt(dateOfBirth.month, 10) === now.getMonth() + 1
  );
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth?.year) return null;
  return new Date().getFullYear() - parseInt(dateOfBirth.year, 10);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

/**
 * Mounts the birthday card overlay if today matches the user's date of birth.
 * Attaches to document.body. Safe to call unconditionally — exits early when
 * it's not the user's birthday.
 *
 * @param {object} strings  The birthday sub-object from User I18n.
 * @param {object} options
 * @param {object} options.profile  The user profile from User.json.
 */
export function mountBirthdayCard(strings, { profile }) {
  if (!isBirthday(profile?.dateOfBirth)) return;

  const firstName = (profile.name ?? '').split(' ')[0].trim() || profile.name;
  const age       = calculateAge(profile.dateOfBirth);
  const hasAvatar = Boolean(profile.avatarPath);

  // ── Overlay ──────────────────────────────────────────────────────────────
  const overlay = createElement('div', 'birthday-overlay');

  // ── Card ─────────────────────────────────────────────────────────────────
  const card = createElement('div', 'birthday-card');

  // Accent top bar
  const accentBar = createElement('div', 'birthday-accent-bar');
  card.append(accentBar);

  // Avatar — only rendered when the user has set a photo
  if (hasAvatar) {
    const avatarWrap = createElement('div', 'birthday-avatar');
    const avatarImg  = createElement('img', 'birthday-avatar-img');
    avatarImg.src = toFileUrl(profile.avatarPath) + '?t=' + Date.now();
    avatarImg.alt = '';
    avatarWrap.append(avatarImg);
    card.append(avatarWrap);
  }

  // "Happy Birthday" label
  const heading = createElement('p', 'birthday-heading', strings.happyBirthday);
  card.append(heading);

  // Name
  const nameEl = createElement('h1', 'birthday-name', firstName);
  card.append(nameEl);

  // Age badge — only when year is known
  if (age !== null) {
    const ageBadge = createElement(
      'span',
      'birthday-age-badge',
      formatText(strings.turningAge, { age: String(age) })
    );
    card.append(ageBadge);
  }

  // Divider
  card.append(createElement('div', 'birthday-divider'));

  // Message
  const messageEl = createElement('p', 'birthday-message');
  messageEl.textContent = formatText(strings.message, { name: firstName });
  card.append(messageEl);

  // Sub-message
  const subMsg = createElement('p', 'birthday-sub-message', strings.fromJoana);
  card.append(subMsg);

  // Dismiss button
  const dismissBtn = createElement('button', 'birthday-dismiss-btn', strings.dismiss);
  dismissBtn.type = 'button';
  card.append(dismissBtn);

  overlay.append(card);
  document.body.append(overlay);

  // ── Animate in ───────────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    overlay.classList.add('birthday-overlay--visible');
    card.classList.add('birthday-card--in');
  });

  // ── Dismiss ───────────────────────────────────────────────────────────────
  function dismiss() {
    overlay.classList.add('birthday-overlay--out');
    setTimeout(() => overlay.remove(), 500);
  }

  dismissBtn.addEventListener('click', dismiss);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });

  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', keyHandler);
      dismiss();
    }
  };
  document.addEventListener('keydown', keyHandler);
}
