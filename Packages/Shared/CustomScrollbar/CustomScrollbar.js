/**
 * attachCustomScrollbar(container, scroller, options?)
 *
 * Injects a smooth custom scrollbar into `container` that tracks `scroller`.
 *
 * @param {HTMLElement} container  The relatively-positioned host element.
 *                                 Receives .joanium-custom-scrollbar-host for
 *                                 the hover-reveal rule. If its computed
 *                                 position is "static" it is set to "relative".
 * @param {HTMLElement} scroller   The element that actually scrolls
 *                                 (overflow-y: auto/scroll, scrollbar hidden).
 * @param {object}      [options]
 * @param {number}      [options.top=12]    Track inset from container top (px).
 * @param {number}      [options.bottom=12] Track inset from container bottom (px).
 * @param {number}      [options.right=8]   Track inset from container right (px).
 * @param {number}      [options.minThumb=32] Minimum thumb height (px).
 *
 * @returns {{ dispose(): void }} Call dispose() to remove the scrollbar and
 *                                clean up all listeners / observers.
 */
export function attachCustomScrollbar(
  container,
  scroller,
  { top = 12, bottom = 12, right = 8, minThumb = 32 } = {},
) {
  /* ── ensure container is a positioning context ── */
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  container.classList.add('joanium-custom-scrollbar-host');

  /* ── build DOM ── */
  const track = document.createElement('div');
  track.className = 'joanium-custom-scrollbar';
  track.style.cssText = `top:${top}px; bottom:${bottom}px; right:${right}px; display:none;`;

  const thumb = document.createElement('div');
  thumb.className = 'joanium-custom-scrollbar__thumb';
  track.append(thumb);
  container.append(track);

  /* ── rAF-batched update ─────────────────────────────────────────────────
     Uses transform:translateY instead of `top` so the browser can handle
     the repaint on the compositor thread — no layout recalculation.
  ── */
  let rafId = 0;

  function updateThumb() {
    const scrollable = scroller.scrollHeight - scroller.clientHeight;

    // Use a small tolerance — sub-pixel rounding and margin collapse
    // differences under overflow:hidden can inflate scrollHeight by 1-3px.
    if (scrollable <= 4) {
      track.style.display = 'none';
      return;
    }

    track.style.display = '';

    const trackH = track.clientHeight;
    const thumbH = Math.max((scroller.clientHeight / scroller.scrollHeight) * trackH, minThumb);
    const maxOffset = trackH - thumbH;
    const progress = scroller.scrollTop / scrollable;

    thumb.style.height = `${thumbH}px`;
    thumb.style.transform = `translateY(${progress * maxOffset}px)`;
  }

  function scheduleUpdate() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateThumb);
  }

  /* Forward wheel events so the scroller still responds to the mouse wheel
     even when its overflow is set to hidden (no native scrollbar).
     Horizontal wheel events (trackpad side-swipe) are intentionally skipped so
     that any child element with its own horizontal scroll axis — e.g. the
     provider-picker carousel — can handle them natively without interference. */
  const onWheel = (e) => {
    // If the gesture is primarily horizontal, let native horizontal scroll work.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    const scrollable = scroller.scrollHeight - scroller.clientHeight;
    if (scrollable <= 4) return;
    e.preventDefault();
    scroller.scrollTop = Math.max(0, Math.min(scrollable, scroller.scrollTop + e.deltaY));
    scheduleUpdate();
  };
  container.addEventListener('wheel', onWheel, { passive: false });

  /* ── drag-to-scroll ── */
  let dragging = false;
  let dragStartY = 0;
  let dragStartScroll = 0;

  thumb.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    dragStartY = e.clientY;
    dragStartScroll = scroller.scrollTop;
    thumb.classList.add('is-dragging');
    thumb.setPointerCapture(e.pointerId);
  });

  thumb.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const scrollable = scroller.scrollHeight - scroller.clientHeight;
    const maxOffset = track.clientHeight - thumb.offsetHeight;
    if (maxOffset <= 0) return;
    const delta = e.clientY - dragStartY;
    scroller.scrollTop = dragStartScroll + (delta / maxOffset) * scrollable;
  });

  const stopDrag = () => {
    dragging = false;
    thumb.classList.remove('is-dragging');
  };
  thumb.addEventListener('pointerup', stopDrag);
  thumb.addEventListener('pointercancel', stopDrag);

  /* ── passive scroll listener (does NOT block scroll thread) ── */
  scroller.addEventListener('scroll', scheduleUpdate, { passive: true });

  /* ── ResizeObserver: re-calculate when scroller or container resizes ── */
  const ro = new ResizeObserver(scheduleUpdate);
  ro.observe(scroller);
  ro.observe(container);

  /* initial paint */
  scheduleUpdate();

  /* ── cleanup ── */
  return {
    dispose() {
      cancelAnimationFrame(rafId);
      scroller.removeEventListener('scroll', scheduleUpdate);
      container.removeEventListener('wheel', onWheel);
      ro.disconnect();
      track.remove();
      container.classList.remove('joanium-custom-scrollbar-host');
    },
  };
}
