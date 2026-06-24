import { invokeIpc } from '../Ipc/RendererIpc.js';

const volume = 1; // By default, play at full volume. This can be adjusted later if needed.
const SOUNDS = {
  'sidebar-click': { file: '../../../Assets/Sounds/SidebarClick.mp3', volume },
  completion: { file: '../../../Assets/Sounds/Notification.mp3', volume },
};

const MIN_DURATION_MS = 3000;

const cache = new Map();
let completionAborted = false;

function ensure(name) {
  if (cache.has(name)) return cache.get(name);
  const def = SOUNDS[name];
  if (!def) return null;
  try {
    const url = new URL(def.file, import.meta.url).toString();
    const audio = new Audio(url);
    audio.volume = def.volume ?? 1;
    audio.preload = 'auto';
    audio.load();
    cache.set(name, audio);
    return audio;
  } catch {
    return null;
  }
}

export function initSounds() {
  for (const name of Object.keys(SOUNDS)) ensure(name);
}

export function play(name) {
  const s = ensure(name);
  if (!s) return;
  s.currentTime = 0;
  void s.play().catch(() => {});
}

export function markCompletionAborted() {
  completionAborted = true;
}

async function isCompletionEnabled() {
  try {
    const settings = await invokeIpc('app-settings:get');
    return settings?.completionSound !== false;
  } catch {
    return true;
  }
}

export async function playCompletion(startTimeMs) {
  const wasAborted = completionAborted;
  completionAborted = false;

  if (wasAborted || Date.now() - startTimeMs < MIN_DURATION_MS) return;
  if (!(await isCompletionEnabled())) return;

  play('completion');
}
