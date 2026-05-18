import path from 'node:path';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

// ── Crypto constants ────────────────────────────────────────────────────────
// 210,000 PBKDF2-SHA512 iterations — matches OWASP 2024 recommendation.
const HASH_ITERATIONS = 210_000;
const HASH_LENGTH = 64; // bytes → 128-char hex string
const HASH_DIGEST = 'sha512';
const SALT_BYTES = 32; // 256-bit random salt per credential

// ── Rate-limiting schedule ──────────────────────────────────────────────────
const LOCKOUT_SCHEDULE = [
  { minAttempts: 3, durationMs: 30_000 }, //  30 seconds
  { minAttempts: 5, durationMs: 5 * 60_000 }, //   5 minutes
  { minAttempts: 7, durationMs: 15 * 60_000 }, //  15 minutes
  { minAttempts: 10, durationMs: 60 * 60_000 }, //   1 hour
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

// ── Allowed auto-lock timeout keys ────────────────────────────────────────
const VALID_TIMEOUTS = new Set(['never', '1min', '5min', '10min', '15min', '30min', '1hr']);

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
    lockedUntil: null,
    autoLockTimeout: 'never',
  };
}

// ── Config/Security/Security.json helpers ───────────────────────────────────
// Security credentials are stored in their own dedicated file under Config so
// they are clearly separated from user profile data.

export function createSecurityStateManager({ rootDirectory }) {
  const securityFilePath = path.join(getWritableDataDirectory(rootDirectory), 'Security.json');

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
      const now = Date.now();
      const isCurrentlyLocked =
        state.enabled && state.lockedUntil !== null && now < state.lockedUntil;

      return {
        enabled: state.enabled,
        locked: isCurrentlyLocked,
        lockedUntil: isCurrentlyLocked ? state.lockedUntil : null,
        failedAttempts: state.failedPasswordAttempts,
        secretQuestion: state.enabled ? state.secretQuestion : null,
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

      const passwordSalt = generateSalt();
      const passwordHash = hashValue(password, passwordSalt);
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
        lockedUntil: null,
        // Clear any previous explicit-disable marker so tamper detection works
        // correctly if the user re-enables after a deliberate disable.
        _explicitlyDisabled: false,
      });

      return { success: true };
    },

    async disable(currentPassword) {
      const state = await readSecurity();
      if (!state.enabled) return { success: true };

      if (!verifyValue(currentPassword, state.passwordHash, state.passwordSalt)) {
        return { success: false, error: 'wrongPassword' };
      }

      // Write an explicit disable marker so the tamper-detection guard in the
      // renderer can tell the difference between a deliberate disable and a
      // deleted / cleared Security.json file.
      await writeSecurity({ ...createDefaultSecurity(), _explicitlyDisabled: true });
      return { success: true };
    },

    async verifyPassword(password) {
      const state = await readSecurity();
      if (!state.enabled) return { success: true };

      const now = Date.now();

      // Still within a lockout window — reject immediately.
      if (state.lockedUntil !== null && now < state.lockedUntil) {
        return {
          success: false,
          locked: true,
          lockedUntil: state.lockedUntil,
          failedAttempts: state.failedPasswordAttempts,
        };
      }

      const ok = verifyValue(password, state.passwordHash, state.passwordSalt);

      if (ok) {
        await writeSecurity({ ...state, failedPasswordAttempts: 0, lockedUntil: null });
        return { success: true, locked: false, failedAttempts: 0 };
      }

      // Increment failure counter and apply lockout.
      const nextAttempts = state.failedPasswordAttempts + 1;
      const lockDuration = getLockoutDuration(nextAttempts);
      const nextLockedUntil = lockDuration > 0 ? now + lockDuration : null;

      await writeSecurity({
        ...state,
        failedPasswordAttempts: nextAttempts,
        lockedUntil: nextLockedUntil,
      });

      return {
        success: false,
        locked: nextLockedUntil !== null,
        lockedUntil: nextLockedUntil,
        failedAttempts: nextAttempts,
      };
    },

    async verifyAnswer(answer) {
      const state = await readSecurity();
      if (!state.enabled) return { success: true };

      const ok = verifyValue(
        answer.trim().toLowerCase(),
        state.secretAnswerHash,
        state.secretAnswerSalt,
      );

      if (ok) {
        // Reset failure counter and unlock.
        await writeSecurity({ ...state, failedPasswordAttempts: 0, lockedUntil: null });
        return { success: true };
      }

      return { success: false, error: 'wrongAnswer' };
    },

    async getAutoLockTimeout() {
      const state = await readSecurity();
      return state.autoLockTimeout ?? 'never';
    },

    async setAutoLockTimeout(timeout) {
      if (!VALID_TIMEOUTS.has(timeout)) {
        return { success: false, error: 'invalidTimeout' };
      }
      const state = await readSecurity();
      await writeSecurity({ ...state, autoLockTimeout: timeout });
      return { success: true };
    },

    // Returns a sanitised snapshot of the current security config for the
    // renderer to keep in localStorage / sessionStorage as a tamper-detection
    // backup.  Hashes and salts are included so the backup can be restored to
    // Security.json if the file is cleared or deleted.
    // Returns null when security is not currently enabled.
    async getBackupState() {
      const state = await readSecurity();
      if (!state.enabled) return null;
      return {
        enabled: true,
        passwordHash: state.passwordHash,
        passwordSalt: state.passwordSalt,
        secretQuestion: state.secretQuestion,
        secretAnswerHash: state.secretAnswerHash,
        secretAnswerSalt: state.secretAnswerSalt,
        autoLockTimeout: state.autoLockTimeout ?? 'never',
      };
    },

    // Writes backup credentials back to Security.json when tamper is detected.
    // Refuses to overwrite a file that was explicitly disabled by the user
    // (guarded by the _explicitlyDisabled marker written in disable()).
    async restoreFromBackup(backup) {
      if (!backup?.enabled || !backup.passwordHash || !backup.passwordSalt) {
        return { success: false, error: 'invalidBackup' };
      }

      const current = await readSecurity();

      if (current.enabled) {
        return { success: false, error: 'alreadyEnabled' };
      }

      if (current._explicitlyDisabled) {
        // The user intentionally removed the lock — do not restore.
        return { success: false, error: 'explicitlyDisabled' };
      }

      await writeSecurity({
        enabled: true,
        passwordHash: backup.passwordHash,
        passwordSalt: backup.passwordSalt,
        secretQuestion: backup.secretQuestion ?? null,
        secretAnswerHash: backup.secretAnswerHash ?? null,
        secretAnswerSalt: backup.secretAnswerSalt ?? null,
        autoLockTimeout: backup.autoLockTimeout ?? 'never',
        failedPasswordAttempts: 0,
        lockedUntil: null,
        _explicitlyDisabled: false,
      });

      return { success: true };
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
        lockedUntil: null,
      });

      return { success: true };
    },
  };
}
