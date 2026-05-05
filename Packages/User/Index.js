import { createUserStateManager } from './Core/UserState.js';

export async function createPackage({ rootDirectory }) {
  const userStateManager = createUserStateManager({ rootDirectory });

  return {
    id: 'User',
    ipcHandlers: [
      {
        channel: 'user:get-profile',
        handler: async () => userStateManager.getProfile()
      },
      {
        channel: 'user:save-profile',
        handler: async (_event, profile) => userStateManager.saveProfile(profile)
      }
    ]
  };
}
