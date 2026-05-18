import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

// ── Storage key ───────────────────────────────────────────────────────────────
// A single consistent key used across both sessionStorage and localStorage so
// the backup payload is always found in the same place.
const STORAGE_KEY = 'joanium_security_backup';

// ── Backup helpers ────────────────────────────────────────────────────────────
// The backup contains hashed credentials only (never plaintext) and is stored
// in two independent browser storages:
//
//   sessionStorage — lives only for this Electron window session. An external
//     attacker who clears Security.json on disk cannot clear sessionStorage
//     without also having renderer access, making it the stronger tamper signal
//     while the app is running.
//
//   localStorage — persists across restarts. If the app is killed and
//     relaunched after Security.json is wiped, localStorage is the fallback
//     that lets the boot guard detect and reverse the tampering.
//
// On intentional disable the user confirms with their password in the main
// process, which writes _explicitlyDisabled:true to Security.json. The renderer
// then calls clearBackup() so neither storage retains stale credentials.

export function saveBackup(backup) {
  if (!backup) return;
  const serialized = JSON.stringify(backup);
  try {
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Non-fatal — storage may be full or unavailable.
  }
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Non-fatal.
  }
}

export function loadBackup() {
  // Prefer sessionStorage: harder for an external process to wipe mid-session.
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Fall back to localStorage for cross-restart persistence.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function clearBackup() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ── resolveSecurityStatus ─────────────────────────────────────────────────────
// Drop-in replacement for `invokeIpc('security:get-status')` at boot time.
// Adds tamper detection on top: if Security.json was cleared or deleted while
// the app was closed, and a valid backup exists in storage, the backup is
// restored to disk before the lock screen mounts so the app remains protected.
//
// Algorithm:
//   1. Fetch the live status from the main process.
//   2. Enabled  → refresh the backup (keeps it current after pw/timeout changes)
//                 and return the status unchanged.
//   3. Disabled + backup present → try security:restore-from-backup via IPC.
//        • Restored   → fetch a fresh status and return it (lock screen mounts).
//        • ExplicitlyDisabled → user turned off the lock intentionally; clear
//                               the now-stale backup and return disabled status.
//        • Other failure → fall through, return disabled status.
//   4. Disabled + no backup → return disabled status as-is.

export async function resolveSecurityStatus() {
  let status;

  try {
    status = await invokeIpc('security:get-status');
  } catch {
    // Security package unavailable — proceed without a lock screen.
    return { enabled: false };
  }

  if (status.enabled) {
    // App lock is intact. Refresh the in-storage backup so it stays current
    // (e.g. after a password change or auto-lock timeout update).
    try {
      const backup = await invokeIpc('security:get-backup-state');
      if (backup) saveBackup(backup);
    } catch {
      // Non-fatal — backup refresh is best-effort.
    }
    return status;
  }

  // Security.json reports disabled. Check whether we have a backup that
  // contradicts this — if so, the file was likely tampered with externally.
  const backup = loadBackup();
  if (!backup?.enabled) {
    // No backup, or backup also says disabled — genuinely off state.
    return status;
  }

  // Backup says security should be enabled. Attempt to restore Security.json.
  try {
    const result = await invokeIpc('security:restore-from-backup', backup);

    if (result.success) {
      // Security.json has been healed. Fetch a fresh status so the lock screen
      // receives correct secretQuestion / lockedUntil values.
      const restored = await invokeIpc('security:get-status');
      return restored;
    }

    if (result.error === 'explicitlyDisabled') {
      // The main process confirmed the user intentionally disabled the lock.
      // The stale backup in storage is now misleading — remove it.
      clearBackup();
    }

    // 'alreadyEnabled' or 'invalidBackup' → fall through.
  } catch {
    // IPC failure — fail open (no lock screen) rather than blocking the user.
  }

  return status;
}
