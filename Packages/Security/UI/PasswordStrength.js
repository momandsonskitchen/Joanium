// ── PasswordStrength.js ───────────────────────────────────────────────────────
// Checks a candidate password against common weaknesses and personal info.
// Returns { weak: false } or { weak: true, category: string, roast: string }.
// Pure utility — no DOM, no IPC.

// ── Common terrible passwords ─────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '123123',
  '121212',
  '112233',
  'password',
  'password1',
  'password123',
  'pass123',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'asdfgh',
  'asdfghjkl',
  'zxcvbn',
  '1q2w3e',
  '1q2w3e4r',
  '1qaz2wsx',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'iloveyou',
  'sunshine',
  'princess',
  'shadow',
  'superman',
  'batman',
  'trustno1',
  'admin',
  'login',
  'solo',
  'abc123',
  'abc',
  'test',
  'guest',
  'user',
  '654321',
  '987654',
  '987654321',
  '555555',
  '696969',
]);

// ── Keyboard walk patterns ────────────────────────────────────────────────────

const KEYBOARD_WALKS = [
  'qwerty',
  'qwertyu',
  'qwertyui',
  'qwertyuio',
  'qwertyuiop',
  'asdfgh',
  'asdfghj',
  'asdfghjk',
  'asdfghjkl',
  'zxcvbn',
  'zxcvbnm',
  '1qaz',
  '2wsx',
  '3edc',
  '1qaz2wsx',
  'qazwsx',
  'qazwsxedc',
  '!qaz',
  '@wsx',
];

// ── DOB format generator ──────────────────────────────────────────────────────

function dobVariants({ day, month, year }) {
  if (!day || !month || !year) return [];

  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  const y = String(year);
  const yy = y.slice(-2);

  return [
    `${d}${m}${y}`, // DDMMYYYY
    `${m}${d}${y}`, // MMDDYYYY
    `${y}${m}${d}`, // YYYYMMDD
    `${d}${m}${yy}`, // DDMMYYv
    `${m}${d}${yy}`, // MMDDYYv
    `${yy}${m}${d}`, // YYMMDDv
    `${d}/${m}/${y}`,
    `${m}/${d}/${y}`,
    `${d}-${m}-${y}`,
    `${m}-${d}-${y}`,
    `${d}.${m}.${y}`,
    String(day) + String(month) + y,
    String(month) + String(day) + y,
    y + String(month) + String(day),
    d + m, // just DDMM
    m + d, // just MMDD
    y, // just the year
    yy, // just YY
  ];
}

// ── Sequential run check ──────────────────────────────────────────────────────

function isSequentialRun(pw) {
  if (pw.length < 4) return false;
  let asc = 0;
  let desc = 0;
  for (let i = 1; i < pw.length; i++) {
    const diff = pw.charCodeAt(i) - pw.charCodeAt(i - 1);
    if (diff === 1) {
      asc++;
    } else {
      asc = 0;
    }
    if (diff === -1) {
      desc++;
    } else {
      desc = 0;
    }
    if (asc >= 3 || desc >= 3) return true;
  }
  return false;
}

// ── Repeated character check ──────────────────────────────────────────────────

function isRepeatedChars(pw) {
  if (pw.length < 4) return false;
  return /^(.)\1{3,}$/.test(pw);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * @param {string} password
 * @param {{ name?: string, dateOfBirth?: { day: number, month: number, year: number } }} profile
 * @returns {{ weak: false } | { weak: true, category: string, roast: string }}
 */
export function checkPasswordStrength(password, profile = {}) {
  const pw = password.trim();
  const pwLower = pw.toLowerCase();

  // 1. Too short (handled upstream, but guard here too)
  if (pw.length < 6) {
    return {
      weak: true,
      category: 'tooShort',
      roast: "That's not a password, that's a PIN having an identity crisis.",
    };
  }

  // 2. Common password
  if (COMMON_PASSWORDS.has(pwLower)) {
    return {
      weak: true,
      category: 'common',
      roast: `"${pw}"? Seriously? That's the combination an idiot would have on their luggage.`,
    };
  }

  // 3. Keyboard walk
  if (KEYBOARD_WALKS.some((walk) => pwLower.includes(walk))) {
    return {
      weak: true,
      category: 'keyboardWalk',
      roast: "A keyboard smash is not a password strategy. You're basically handing someone a key.",
    };
  }

  // 4. Sequential run (12345, abcde, zyxwv)
  if (isSequentialRun(pw)) {
    return {
      weak: true,
      category: 'sequential',
      roast: 'Did you just hold down a key and call it a day? Even a toddler could crack that.',
    };
  }

  // 5. Repeated characters (aaaaaa, 111111)
  if (isRepeatedChars(pw)) {
    return {
      weak: true,
      category: 'repeated',
      roast: "One character repeated over and over isn't a password. It's a cry for help.",
    };
  }

  // 6. User's own name
  if (profile.name) {
    const nameParts = profile.name
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length >= 3);
    for (const part of nameParts) {
      if (pwLower === part || pwLower.includes(part)) {
        return {
          weak: true,
          category: 'name',
          roast: 'Using your own name? Even your dog could guess that.',
        };
      }
    }
  }

  // 7. Date of birth
  if (profile.dateOfBirth) {
    const variants = dobVariants(profile.dateOfBirth);
    if (variants.some((v) => pwLower === v || pwLower.includes(v))) {
      return {
        weak: true,
        category: 'dob',
        roast: "Your birthday as a password? Bold of you to assume hackers don't have Google.",
      };
    }
  }

  return { weak: false };
}
