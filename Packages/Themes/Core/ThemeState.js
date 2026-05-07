import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';

const DEFAULT_THEME_STATE = Object.freeze({
  mode: 'system',
  motion: 'full'
});

const THEME_MODES = new Set(['system', 'light', 'dark']);
const MOTION_MODES = new Set(['full', 'reduced']);

function sanitizeThemeState(candidate = {}) {
  const mode = THEME_MODES.has(candidate.mode) ? candidate.mode : DEFAULT_THEME_STATE.mode;
  const motion = MOTION_MODES.has(candidate.motion) ? candidate.motion : DEFAULT_THEME_STATE.motion;
  return { mode, motion };
}

export function createThemeStateManager({ rootDirectory }) {
  async function readThemeState() {
    const userState = await readUserState(rootDirectory);
    return sanitizeThemeState(userState.theme);
  }

  async function writeThemeState(nextState) {
    const state = sanitizeThemeState(nextState);
    const userState = await readUserState(rootDirectory);
    await writeUserState(rootDirectory, { ...userState, theme: state });
    return state;
  }

  return {
    readThemeState,
    writeThemeState
  };
}
