import { createSecurityStateManager } from './Core/SecurityState.js';

export async function createPackage({ rootDirectory }) {
  const security = createSecurityStateManager({ rootDirectory });

  return {
    id: 'Security',
    ipcHandlers: [
      {
        channel: 'security:get-status',
        handler: async () => security.getStatus()
      },
      {
        channel: 'security:enable',
        handler: async (_event, password, secretQuestion, secretAnswer) =>
          security.enable(password, secretQuestion, secretAnswer)
      },
      {
        channel: 'security:disable',
        handler: async (_event, currentPassword) => security.disable(currentPassword)
      },
      {
        channel: 'security:verify-password',
        handler: async (_event, password) => security.verifyPassword(password)
      },
      {
        channel: 'security:verify-answer',
        handler: async (_event, answer) => security.verifyAnswer(answer)
      },
      {
        channel: 'security:change-password',
        handler: async (_event, currentPassword, newPassword) =>
          security.changePassword(currentPassword, newPassword)
      }
    ]
  };
}
