import { createProviderIcon } from '../Icons/Icons.js';

function createProviderTile({ provider, selectedIds, onToggle }) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'joanium-provider-tile';
  card.style.setProperty('--provider-tint', provider.palette.tint);

  const icon =
    provider.iconPath && provider.iconPath.trim()
      ? createProviderIcon(provider.iconPath, {
          className: 'joanium-provider-tile__icon-image',
          alt: provider.label,
        })
      : (() => {
          const fallback = document.createElement('span');
          fallback.className = 'joanium-provider-tile__icon-fallback';
          fallback.textContent = String(provider.label ?? '')
            .trim()
            .charAt(0)
            .toUpperCase();
          return fallback;
        })();

  const name = document.createElement('span');
  name.className = 'joanium-provider-tile__name';
  name.textContent = provider.label;

  const tick = document.createElement('span');
  tick.className = 'joanium-provider-tile__tick';

  card.append(icon, name, tick);
  card.classList.toggle('is-selected', selectedIds.has(provider.id));
  card.providerId = provider.id;

  card.addEventListener('click', () => {
    if (typeof onToggle === 'function') {
      onToggle(provider.id);
    }
  });

  return card;
}

export function createProviderScroller({ providers, selectedProviderIds, onToggle }) {
  const viewport = document.createElement('div');
  viewport.className = 'joanium-provider-picker__viewport';

  const track = document.createElement('div');
  track.className = 'joanium-provider-picker__track';
  viewport.append(track);

  const renderedCards = [];
  const selectedIds = new Set(selectedProviderIds);
  let segmentWidth = 0;
  let animationFrameId = 0;
  let isDragging = false;
  let isHovering = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let dragDistance = 0;
  let ignoreNextTap = false;

  function paintSelectedState() {
    for (const card of renderedCards) {
      card.classList.toggle('is-selected', selectedIds.has(card.providerId));
    }
  }

  function onCardToggle(providerId) {
    if (ignoreNextTap) {
      return;
    }

    if (selectedIds.has(providerId)) {
      selectedIds.delete(providerId);
    } else {
      selectedIds.add(providerId);
    }

    paintSelectedState();

    if (typeof onToggle === 'function') {
      onToggle(providerId, Array.from(selectedIds));
    }
  }

  for (const provider of [...providers, ...providers, ...providers]) {
    const card = createProviderTile({
      provider,
      selectedIds,
      onToggle: onCardToggle,
    });
    renderedCards.push(card);
    track.append(card);
  }

  function normalizeScrollPosition() {
    if (!segmentWidth) {
      return;
    }

    if (viewport.scrollLeft < segmentWidth * 0.5) {
      viewport.scrollLeft += segmentWidth;
    } else if (viewport.scrollLeft > segmentWidth * 1.5) {
      viewport.scrollLeft -= segmentWidth;
    }
  }

  function startAutoDrift() {
    cancelAnimationFrame(animationFrameId);

    const tick = () => {
      if (!isDragging && !isHovering) {
        viewport.scrollLeft += 0.18;
        normalizeScrollPosition();
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
  }

  requestAnimationFrame(() => {
    segmentWidth = track.scrollWidth / 3;
    viewport.scrollLeft = segmentWidth;
    startAutoDrift();
  });

  viewport.addEventListener('scroll', normalizeScrollPosition);
  viewport.addEventListener('mouseenter', () => {
    isHovering = true;
  });
  viewport.addEventListener('mouseleave', () => {
    isHovering = false;
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }

    isDragging = true;
    dragDistance = 0;
    dragStartX = event.clientX;
    dragStartScrollLeft = viewport.scrollLeft;
  });

  function handleWindowPointerMove(event) {
    if (!isDragging) {
      return;
    }

    const delta = event.clientX - dragStartX;
    dragDistance = Math.max(dragDistance, Math.abs(delta));
    viewport.scrollLeft = dragStartScrollLeft - delta;
    normalizeScrollPosition();
  }

  function stopDragging() {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    ignoreNextTap = dragDistance > 8;

    window.setTimeout(() => {
      ignoreNextTap = false;
    }, 0);
  }

  window.addEventListener('pointermove', handleWindowPointerMove);
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);

  function dispose() {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('pointercancel', stopDragging);
  }

  return { element: viewport, dispose };
}
