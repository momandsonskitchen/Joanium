import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

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
  const themeFilePath = path.join(rootDirectory, 'Data', 'Theme.json');

  async function readThemeState() {
    try {
      const raw = await readFile(themeFilePath, 'utf8');
      return sanitizeThemeState(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_THEME_STATE };
    }
  }

  async function writeThemeState(nextState) {
    const state = sanitizeThemeState(nextState);
    await mkdir(path.dirname(themeFilePath), { recursive: true });
    await writeFile(themeFilePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    return state;
  }

  return {
    readThemeState,
    writeThemeState
  };
}
