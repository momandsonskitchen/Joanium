import path from 'node:path';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// ── Crypto constants ────────────────────────────────────────────────────────
// 210,000 PBKDF2-SHA512 iterations — matches OWASP 2024 recommendation.
const HASH_ITERATIONS = 210_000;
const HASH_LENGTH     = 64;      // bytes → 128-char hex string
const HASH_DIGEST     = 'sha512';
const SALT_BYTES      = 32;      // 256-bit random salt per credential

// ── Rate-limiting schedule ──────────────────────────────────────────────────
const LOCKOUT_SCHEDULE = [
  { minAttempts:  3, durationMs:       30_000 }, //  30 seconds
  { minAttempts:  5, durationMs:  5 * 60_000  }, //   5 minutes
  { minAttempts:  7, durationMs: 15 * 60_000  }, //  15 minutes
  { minAttempts: 10, durationMs: 60 * 60_000  }, //   1 hour
];

// ── Crypto helpers ──────────────────────────────────────────────────────────

function generateSalt() {
  return randomBytes(SALT_BYTES).toString('hex');
}

function hashValue(value, salt) {
  return pbkdf2Sync(value, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_DIGEST).toString('hex');
}

// Constant-time comparison — prevents timing-based side-channel attacks.
function secureCompare(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function verifyValue(value, storedHash, salt) {
  const candidate = hashValue(value, salt);
  return secureCompare(candidate, storedHash);
}

function getLockoutDuration(failedAttempts) {
  let duration = 0;
  for (const entry of LOCKOUT_SCHEDULE) {
    if (failedAttempts >= entry.minAttempts) {
      duration = entry.durationMs;
    }
  }
  return duration;
}

// ── Default security block ──────────────────────────────────────────────────

function createDefaultSecurity() {
  return {
    enabled: false,
    passwordHash: null,
    passwordSalt: null,
    secretQuestion: null,
    secretAnswerHash: null,
    secretAnswerSalt: null,
    failedPasswordAttempts: 0,
    lockedUntil: null
  };
}

// ── Config/Security/Security.json helpers ───────────────────────────────────
// Security credentials are stored in their own dedicated file under Config so
// they are clearly separated from user profile data.

export function createSecurityStateManager({ rootDirectory }) {
  const securityFilePath = path.join(rootDirectory, 'Data', 'Security.json');

  async function readSecurity() {
    try {
      const raw = await readFile(securityFilePath, 'utf8');
      return { ...createDefaultSecurity(), ...JSON.parse(raw) };
    } catch {
      return createDefaultSecurity();
    }
  }

  async function writeSecurity(securityState) {
    await mkdir(path.dirname(securityFilePath), { recursive: true });
    await writeFile(securityFilePath, `${JSON.stringify(securityState, null, 2)}\n`, 'utf8');
    return securityState;
  }

  return {
    async getStatus() {
      const state = await readSecurity();
      const now   = Date.now();
      const isCurrentlyLocked =
        state.enabled &&
        state.lockedUntil !== null &&
        now < state.lockedUntil;

      return {
        enabled:        state.enabled,
        locked:         isCurrentlyLocked,
        lockedUntil:    isCurrentlyLocked ? state.lockedUntil : null,
        failedAttempts: state.failedPasswordAttempts,
        secretQuestion: state.enabled ? state.secretQuestion : null
      };
    },

    async enable(password, secretQuestion, secretAnswer) {
      if (!password || password.length < 6) {
        return { success: false, error: 'passwordTooShort' };
      }
      if (!secretQuestion || !secretQuestion.trim()) {
        return { success: false, error: 'missingQuestion' };
      }
      if (!secretAnswer || !secretAnswer.trim()) {
        return { success: false, error: 'missingAnswer' };
      }

      const passwordSalt     = generateSalt();
      const passwordHash     = hashValue(password, passwordSalt);
      const secretAnswerSalt = generateSalt();
      // Normalise answer: trim + lowercase so casing doesn't matter.
      const secretAnswerHash = hashValue(secretAnswer.trim().toLowerCase(), secretAnswerSalt);

      const state = await readSecurity();
      await writeSecurity({
        ...state,
        enabled: true,
        passwordHash,
        passwordSalt,
        secretQuestion: secretQuestion.trim(),
        secretAnswerHash,
        secretAnswerSalt,
        failedPasswordAttempts: 0,
        lockedUntil: null
      });

      return { success: true };
    },

    async disable(currentPassword) {
      const state = await readSecurity();
      if (!state.enabled) return { success: true };

      if (!verifyValue(currentPassword, state.passwordHash, state.passwordSalt)) {
        return { success: false, error: 'wrongPassword' };
      }

      await writeSecurity(createDefaultSecurity());
      return { success: true };
    },

    async verifyPassword(password) {
      const state = await readSecurity();
      if (!state.enabled) return { success: true };

      const now = Date.now();

      // Still within a lockout window — reject immediately.
      if (state.lockedUntil !== null && now < state.lockedUntil) {
        return {
          success:        false,
          locked:         true,
          lockedUntil:    state.lockedUntil,
          failedAttempts: state.failedPasswordAttempts
        };
      }

      const ok = verifyValue(password, state.passwordHash, state.passwordSalt);

      if (ok) {
        await writeSecurity({ ...state, failedPasswordAttempts: 0, lockedUntil: null });
        return { success: true, locked: false, failedAttempts: 0 };
      }

      // Increment failure counter and apply lockout.
      const nextAttempts    = state.failedPasswordAttempts + 1;
      const lockDuration    = getLockoutDuration(nextAttempts);
      const nextLockedUntil = lockDuration > 0 ? now + lockDuration : null;

      await writeSecurity({
        ...state,
        failedPasswordAttempts: nextAttempts,
        lockedUntil:            nextLockedUntil
      });

      return {
        success:        false,
        locked:         nextLockedUntil !== null,
        lockedUntil:    nextLockedUntil,
        failedAttempts: nextAttempts
      };
    },

    async verifyAnswer(answer) {
      const state = await readSecurity();
      if (!state.enabled) return { success: true };

      const ok = verifyValue(
        answer.trim().toLowerCase(),
        state.secretAnswerHash,
        state.secretAnswerSalt
      );

      if (ok) {
        // Reset failure counter and unlock.
        await writeSecurity({ ...state, failedPasswordAttempts: 0, lockedUntil: null });
        return { success: true };
      }

      return { success: false, error: 'wrongAnswer' };
    },

    async changePassword(currentPassword, newPassword) {
      const state = await readSecurity();
      if (!state.enabled) return { success: false, error: 'notEnabled' };

      if (!verifyValue(currentPassword, state.passwordHash, state.passwordSalt)) {
        return { success: false, error: 'wrongPassword' };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'passwordTooShort' };
      }

      const passwordSalt = generateSalt();
      const passwordHash = hashValue(newPassword, passwordSalt);

      await writeSecurity({
        ...state,
        passwordHash,
        passwordSalt,
        failedPasswordAttempts: 0,
        lockedUntil:            null
      });

      return { success: true };
    }
  };
}
