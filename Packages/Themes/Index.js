import { createThemeStateManager } from './Core/ThemeState.js';

export async function createPackage({ rootDirectory }) {
  const themeStateManager = createThemeStateManager({ rootDirectory });

  return {
    id: 'Themes',
    ipcHandlers: [
      {
        channel: 'themes:get',
        handler: async () => themeStateManager.readThemeState(),
      },
      {
        channel: 'themes:save',
        handler: async (_event, state) => themeStateManager.writeThemeState(state),
      },
    ],
  };
}
