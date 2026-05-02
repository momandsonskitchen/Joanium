/**
 * createLogoLoader({ logoPath, duration?, size? })
 *
 * Returns { element, done }
 *   element — the full-screen loader node, mount it wherever you need
 *   done    — Promise that resolves when the spin-fade animation completes
 *
 * Usage:
 *   const { element, done } = createLogoLoader({ logoPath, duration: 5000 });
 *   document.getElementById('app').replaceChildren(element);
 *   await done;
 */
export function createLogoLoader({ logoPath, duration = 5000, size = 104 } = {}) {
  const root = document.createElement('div');
  root.className = 'logo-loader';

  const glow = document.createElement('div');
  glow.className = 'logo-loader__glow';

  const wrap = document.createElement('div');
  wrap.className = 'logo-loader__wrap';

  const img = document.createElement('img');
  img.className = 'logo-loader__img';
  img.src = logoPath;
  img.alt = '';
  img.style.setProperty('--logo-loader-duration', `${duration}ms`);
  img.style.width  = `${size}px`;
  img.style.height = `${size}px`;

  wrap.append(img);
  root.append(glow, wrap);

  const done = new Promise((resolve) => setTimeout(resolve, duration));

  return { element: root, done };
}
