import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

const THEME_CLASSES = ['joanium-theme-light', 'joanium-theme-dark'];
const MOTION_CLASSES = ['joanium-motion-full', 'joanium-motion-reduced'];

function resolveThemeMode(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeState(state = {}) {
  const mode = state.mode ?? 'system';
  const resolvedMode = resolveThemeMode(mode);
  const motion = state.motion === 'reduced' ? 'reduced' : 'full';
  const root = document.documentElement;

  root.classList.remove(...THEME_CLASSES, ...MOTION_CLASSES);
  root.classList.add(`joanium-theme-${resolvedMode}`, `joanium-motion-${motion}`);
}

export function stripNativeTooltips() {
  const strip = (element) => {
    if (!element?.hasAttribute?.('title')) return;
    element.removeAttribute('title');
  };

  document.querySelectorAll('[title]').forEach(strip);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        strip(mutation.target);
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: ['title'],
  });

  return () => observer.disconnect();
}

export async function loadAndApplyThemeState() {
  const state = await invokeIpc('themes:get').catch(() => ({
    mode: 'system',
    motion: 'full',
  }));
  applyThemeState(state);
  return state;
}
