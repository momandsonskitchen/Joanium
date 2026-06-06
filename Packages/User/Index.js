import { createUserStateManager } from './Core/UserState.js';
import { pickOpenPath } from '../Shared/Electron/DialogUtils.js';

export async function createPackage({ rootDirectory }) {
  const userStateManager = createUserStateManager({ rootDirectory });

  return {
    id: 'User',
    ipcHandlers: [
      {
        channel: 'user:get-profile',
        handler: async () => userStateManager.getProfile(),
      },
      {
        channel: 'user:save-profile',
        handler: async (_event, profile) => userStateManager.saveProfile(profile),
      },
      {
        channel: 'user:get-custom-instructions',
        handler: async () => userStateManager.getCustomInstructions(),
      },
      {
        channel: 'user:save-custom-instructions',
        handler: async (_event, customInstructions) =>
          userStateManager.saveCustomInstructions(customInstructions),
      },
      {
        channel: 'user:pick-avatar',
        handler: async (event) => {
          return pickOpenPath(event, {
            properties: ['openFile'],
            filters: [
              {
                name: 'Images',
                extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'],
              },
            ],
          });
        },
      },
      {
        channel: 'user:save-avatar',
        handler: async (_event, sourcePath) => userStateManager.saveAvatar(sourcePath),
      },
      {
        channel: 'user:remove-avatar',
        handler: async () => userStateManager.removeAvatar(),
      },
    ],
  };
}
