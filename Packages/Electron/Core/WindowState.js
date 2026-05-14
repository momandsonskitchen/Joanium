import { screen } from 'electron';
import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';

const DEFAULT_BOUNDS = Object.freeze({ width: 1460, height: 960 });
const MINIMUM_BOUNDS = Object.freeze({ width: 1160, height: 780 });
const SAVE_DELAY_MS = 150;

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function normalizeDimension(value, fallback, minimum) {
  return Math.max(minimum, Math.round(isFiniteNumber(value) ? value : fallback));
}

function clampBounds(rawBounds = {}, options = {}) {
  const defaultBounds = options.defaultBounds ?? DEFAULT_BOUNDS;
  const minimumBounds = options.minimumBounds ?? MINIMUM_BOUNDS;
  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  const width = normalizeDimension(rawBounds.width, defaultBounds.width, minimumBounds.width);
  const height = normalizeDimension(rawBounds.height, defaultBounds.height, minimumBounds.height);
  const probe = {
    x: Math.round(isFiniteNumber(rawBounds.x) ? rawBounds.x : primaryWorkArea.x),
    y: Math.round(isFiniteNumber(rawBounds.y) ? rawBounds.y : primaryWorkArea.y),
    width,
    height,
  };
  const display = screen.getDisplayMatching(probe);
  const workArea = display?.workArea ?? primaryWorkArea;
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);
  const centeredX = Math.round(workArea.x + (workArea.width - width) / 2);
  const centeredY = Math.round(workArea.y + (workArea.height - height) / 2);

  return {
    width,
    height,
    x: isFiniteNumber(rawBounds.x)
      ? Math.min(Math.max(Math.round(rawBounds.x), workArea.x), maxX)
      : centeredX,
    y: isFiniteNumber(rawBounds.y)
      ? Math.min(Math.max(Math.round(rawBounds.y), workArea.y), maxY)
      : centeredY,
  };
}

function createDefaultState(options = {}) {
  return {
    bounds: clampBounds(options.defaultBounds ?? DEFAULT_BOUNDS, options),
    isMaximized: true,
    isFullScreen: false,
  };
}

function normalizeState(candidate, options = {}) {
  if (!candidate || typeof candidate !== 'object') {
    return createDefaultState(options);
  }

  return {
    bounds: clampBounds(candidate.bounds ?? {}, options),
    isMaximized: candidate.isMaximized === true,
    isFullScreen: candidate.isFullScreen === true,
  };
}

export async function readWindowState(rootDirectory, options = {}) {
  try {
    const userState = await readUserState(rootDirectory);
    return normalizeState(userState.windowState ?? {}, options);
  } catch {
    return createDefaultState(options);
  }
}

function getPersistableBounds(browserWindow, options = {}) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return clampBounds(options.defaultBounds ?? DEFAULT_BOUNDS, options);
  }

  if (
    typeof browserWindow.getNormalBounds === 'function' &&
    (browserWindow.isMaximized() || browserWindow.isFullScreen())
  ) {
    return clampBounds(browserWindow.getNormalBounds(), options);
  }

  return clampBounds(browserWindow.getBounds(), options);
}

async function writeWindowState(rootDirectory, browserWindow, options = {}) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return;
  }

  const nextWindowState = {
    bounds: getPersistableBounds(browserWindow, options),
    isMaximized: browserWindow.isMaximized(),
    isFullScreen: browserWindow.isFullScreen(),
  };

  const userState = await readUserState(rootDirectory);
  await writeUserState(rootDirectory, { ...userState, windowState: nextWindowState });
}

export function applyWindowState(browserWindow, state) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return;
  }

  if (state?.isFullScreen) {
    browserWindow.setFullScreen(true);
    return;
  }

  if (state?.isMaximized) {
    browserWindow.maximize();
  }
}

export function attachWindowStatePersistence(browserWindow, rootDirectory, options = {}) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return;
  }

  let saveTimer = null;

  const clearSaveTimer = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  const saveSoon = () => {
    clearSaveTimer();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void writeWindowState(rootDirectory, browserWindow, options);
    }, SAVE_DELAY_MS);
  };

  const saveNow = (event) => {
    clearSaveTimer();
    // Prevent the window from closing until the async write has fully flushed.
    // Without this, writeFile truncates User.json to 0 bytes and the process
    // may exit before the write completes, leaving an empty file.
    event.preventDefault();
    writeWindowState(rootDirectory, browserWindow, options)
      .catch(() => {})
      .finally(() => {
        if (!browserWindow.isDestroyed()) {
          browserWindow.destroy();
        }
      });
  };

  browserWindow.on('resize', saveSoon);
  browserWindow.on('move', saveSoon);
  browserWindow.on('maximize', saveSoon);
  browserWindow.on('unmaximize', saveSoon);
  browserWindow.on('enter-full-screen', saveSoon);
  browserWindow.on('leave-full-screen', saveSoon);
  browserWindow.on('close', saveNow);
  browserWindow.on('closed', clearSaveTimer);
}
