import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

// Maps persisted setting keys to milliseconds. Zero means disabled.
const TIMEOUT_MS = {
  never: 0,
  '1min': 1 * 60_000,
  '5min': 5 * 60_000,
  '10min': 10 * 60_000,
  '15min': 15 * 60_000,
  '30min': 30 * 60_000,
  '1hr': 60 * 60_000,
};

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'wheel', 'touchstart'];

// ── createAutoLockTimer ────────────────────────────────────────────────────
// Manages an inactivity-based lock timer for the renderer process.
//
// Usage:
//   const timer = createAutoLockTimer({ onLock: async () => { ... } });
//   timer.start();          // attach activity listeners (call once after boot)
//   await timer.refresh();  // read current settings and arm / disarm
//   timer.stop();           // detach listeners and cancel timer (teardown)
//
// Call refresh() again after:
//   - the lock screen dismisses (so the timer restarts cleanly)
//   - the user changes the auto-lock timeout setting
//   - the user enables or disables the lock

export function createAutoLockTimer({ onLock }) {
  let timerId = null;
  let currentMs = 0;
  let armed = false;

  // ── Timer control ────────────────────────────────────────────────────────

  function clearTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function arm() {
    clearTimer();
    if (!armed || currentMs <= 0) return;

    timerId = setTimeout(() => {
      timerId = null;
      onLock();
    }, currentMs);
  }

  // ── Activity detection ────────────────────────────────────────────────────

  const onActivity = () => {
    if (armed && currentMs > 0) arm();
  };

  function attachListeners() {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true, capture: true });
    }
  }

  function detachListeners() {
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, onActivity, { capture: true });
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // Attach activity listeners. Call once after the app shell is mounted.
    start() {
      attachListeners();
    },

    // Re-read security settings from the main process and arm or disarm the
    // timer. Call after boot, after lock screen dismisses, and after settings change.
    async refresh() {
      try {
        const status = await invokeIpc('security:get-status');

        if (!status.enabled) {
          armed = false;
          clearTimer();
          return;
        }

        const setting = await invokeIpc('security:get-auto-lock-timeout');
        currentMs = TIMEOUT_MS[setting] ?? 0;
        armed = true;
        arm();
      } catch {
        // Non-fatal — security package may not be available.
      }
    },

    // Pause the timer without detaching listeners (e.g. while lock screen is up).
    pause() {
      armed = false;
      clearTimer();
    },

    // Stop completely and detach all listeners (app teardown).
    stop() {
      armed = false;
      clearTimer();
      detachListeners();
    },
  };
}
