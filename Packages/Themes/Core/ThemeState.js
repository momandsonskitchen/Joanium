import { readUserState, writeUserState, sanitizeTheme } from '../../Shared/UserData/UserData.js';

export function createThemeStateManager({ rootDirectory }) {
  async function readThemeState() {
    const userState = await readUserState(rootDirectory);
    return sanitizeTheme(userState.theme);
  }

  async function writeThemeState(nextState) {
    const state = sanitizeTheme(nextState);
    const userState = await readUserState(rootDirectory);
    await writeUserState(rootDirectory, { ...userState, theme: state });
    return state;
  }

  return {
    readThemeState,
    writeThemeState,
  };
}
