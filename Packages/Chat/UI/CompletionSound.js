import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

const SOUND_URL = new URL('../../../Assets/Sounds/Notification.mp3', import.meta.url).toString();
const MIN_DURATION_MS = 3000;
const VOLUME = 1;

let audio = null;
let aborted = false;

function ensureAudio() {
  if (audio) {
    return audio;
  }

  try {
    audio = new Audio(SOUND_URL);
    audio.volume = VOLUME;
    audio.preload = 'auto';
    audio.load();
  } catch {
    audio = null;
  }

  return audio;
}

async function isCompletionSoundEnabled() {
  try {
    const settings = await invokeIpc('app-settings:get');
    return settings?.completionSound !== false;
  } catch {
    return true;
  }
}

export function initCompletionSound() {
  ensureAudio();
}

export function markCompletionSoundAborted() {
  aborted = true;
}

export async function playCompletionSound(startTimeMs) {
  const wasAborted = aborted;
  aborted = false;

  if (wasAborted || Date.now() - startTimeMs < MIN_DURATION_MS) {
    return;
  }

  if (!(await isCompletionSoundEnabled())) {
    return;
  }

  const sound = ensureAudio();
  if (!sound) {
    return;
  }

  sound.currentTime = 0;
  await sound.play().catch(() => {});
}
