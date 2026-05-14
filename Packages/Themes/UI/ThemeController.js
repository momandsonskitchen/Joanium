import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

const THEME_CLASSES = ['joanium-theme-light', 'joanium-theme-dark'];
const MOTION_CLASSES = ['joanium-motion-full', 'joanium-motion-reduced'];
const FONT_STACKS = {
  system:
    "'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  sora: "'Sora', 'SF Pro Display', 'Segoe UI', sans-serif",
  'dm-sans': "'DM Sans', 'SF Pro Display', 'Segoe UI', sans-serif",
  nunito: "'Nunito', 'SF Pro Display', 'Segoe UI', sans-serif",
  'plus-jakarta': "'Plus Jakarta Sans', 'SF Pro Display', 'Segoe UI', sans-serif",
  outfit: "'Outfit', 'SF Pro Display', 'Segoe UI', sans-serif",
  manrope: "'Manrope', 'SF Pro Display', 'Segoe UI', sans-serif",
  poppins: "'Poppins', 'SF Pro Display', 'Segoe UI', sans-serif",
};

function resolveThemeMode(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeState(state = {}) {
  const mode = state.mode ?? 'system';
  const resolvedMode = resolveThemeMode(mode);
  const motion = state.motion === 'reduced' ? 'reduced' : 'full';
  const font = FONT_STACKS[state.font] ? state.font : 'system';
  const root = document.documentElement;

  root.classList.remove(...THEME_CLASSES, ...MOTION_CLASSES);
  root.classList.add(`joanium-theme-${resolvedMode}`, `joanium-motion-${motion}`);
  root.style.setProperty('--font-family', FONT_STACKS[font]);
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
    font: 'system',
  }));
  applyThemeState(state);
  return state;
}
