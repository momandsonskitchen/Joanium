import { createSecurityStateManager } from './Core/SecurityState.js';

export async function createPackage({ rootDirectory }) {
  const security = createSecurityStateManager({ rootDirectory });

  return {
    id: 'Security',
    ipcHandlers: [
      {
        channel: 'security:get-status',
        handler: async () => security.getStatus(),
      },
      {
        channel: 'security:enable',
        handler: async (_event, password, secretQuestion, secretAnswer) =>
          security.enable(password, secretQuestion, secretAnswer),
      },
      {
        channel: 'security:disable',
        handler: async (_event, currentPassword) => security.disable(currentPassword),
      },
      {
        channel: 'security:verify-password',
        handler: async (_event, password) => security.verifyPassword(password),
      },
      {
        channel: 'security:verify-answer',
        handler: async (_event, answer) => security.verifyAnswer(answer),
      },
      {
        channel: 'security:get-auto-lock-timeout',
        handler: async () => security.getAutoLockTimeout(),
      },
      {
        channel: 'security:set-auto-lock-timeout',
        handler: async (_event, timeout) => security.setAutoLockTimeout(timeout),
      },
      {
        channel: 'security:change-password',
        handler: async (_event, currentPassword, newPassword) =>
          security.changePassword(currentPassword, newPassword),
      },
      // ── Tamper-detection backup ─────────────────────────────────────────
      // The renderer stores a copy of the hashed credentials in sessionStorage
      // and localStorage so it can detect and repair a cleared Security.json.
      {
        channel: 'security:get-backup-state',
        handler: async () => security.getBackupState(),
      },
      {
        channel: 'security:restore-from-backup',
        handler: async (_event, backup) => security.restoreFromBackup(backup),
      },
    ],
  };
}
