import { dialog } from 'electron';
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
      },
      {
        channel: 'user:pick-avatar',
        handler: async (event) => {
          const window = event.sender.getOwnerBrowserWindow();
          const result = await dialog.showOpenDialog(window, {
            properties: ['openFile'],
            filters: [
              {
                name: 'Images',
                extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif']
              }
            ]
          });
          return result.canceled ? null : (result.filePaths[0] ?? null);
        }
      },
      {
        channel: 'user:save-avatar',
        handler: async (_event, sourcePath) => userStateManager.saveAvatar(sourcePath)
      },
      {
        channel: 'user:remove-avatar',
        handler: async () => userStateManager.removeAvatar()
      }
    ]
  };
}
