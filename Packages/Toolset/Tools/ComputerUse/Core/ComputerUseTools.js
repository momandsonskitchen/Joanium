import strings from '../I18n/en.js';
import { openComputerTarget } from './AppTools.js';
import {
  copySelection,
  getClipboardInfo,
  getClipboardText,
  pasteClipboard,
  selectAll,
  setClipboardText,
} from './ClipboardTools.js';
import { computerKeyPress, computerTypeText } from './KeyboardTools.js';
import { computerClick, computerDrag, computerMouseMove, computerScroll } from './MouseTools.js';
import { captureScreenshot, getCursorPosition, getScreenInfo } from './ScreenTools.js';
import {
  controlWindow,
  focusWindow,
  getActiveWindow,
  listWindows,
  setWindowBounds,
} from './WindowTools.js';

function requireFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(strings.errors.requiredNumber.replace('{label}', label));
  }

  return number;
}

function normalizeButton(button) {
  const value = String(button || 'left').toLowerCase();
  if (['left', 'right', 'middle'].includes(value)) {
    return value;
  }

  throw new Error(strings.errors.invalidButton);
}

function normalizeDirection(direction) {
  const value = String(direction || 'up').toLowerCase();
  if (['up', 'down'].includes(value)) {
    return value;
  }

  throw new Error(strings.errors.invalidDirection);
}

function normalizeAmount(amount) {
  const value = Number(amount ?? 3);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(strings.errors.requiredNumber.replace('{label}', 'amount'));
  }

  return Math.max(1, Math.min(20, Math.round(value)));
}

function normalizeDurationMs(durationMs) {
  const value = Number(durationMs ?? 500);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(strings.errors.requiredNumber.replace('{label}', 'duration_ms'));
  }

  return Math.max(0, Math.min(5000, Math.round(value)));
}

function normalizeWaitMs(milliseconds) {
  const value = Number(milliseconds ?? 1000);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(strings.errors.requiredNumber.replace('{label}', 'milliseconds'));
  }

  return Math.max(0, Math.min(30000, Math.round(value)));
}

function normalizeWindowBounds(params = {}) {
  const x = requireFiniteNumber(params.x, 'x');
  const y = requireFiniteNumber(params.y, 'y');
  const width = requireFiniteNumber(params.width, 'width');
  const height = requireFiniteNumber(params.height, 'height');

  if (width <= 0 || height <= 0) {
    throw new Error(strings.errors.invalidBounds);
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function createComputerUseToolHandlers() {
  return {
    async computer_screenshot(params = {}) {
      return captureScreenshot(params.window_title ? String(params.window_title) : '');
    },

    async computer_get_screen_info() {
      return getScreenInfo();
    },

    async computer_get_cursor_position() {
      return getCursorPosition();
    },

    async computer_click(params = {}) {
      const x = requireFiniteNumber(params.x, 'x');
      const y = requireFiniteNumber(params.y, 'y');
      return computerClick(x, y, normalizeButton(params.button), Boolean(params.double));
    },

    async computer_type_text(params = {}) {
      if (params.text == null) {
        throw new Error(strings.errors.requiredText);
      }

      return computerTypeText(String(params.text));
    },

    async computer_key_press(params = {}) {
      if (!params.keys) {
        throw new Error(strings.errors.requiredKeys);
      }

      return computerKeyPress(String(params.keys));
    },

    async computer_mouse_move(params = {}) {
      const x = requireFiniteNumber(params.x, 'x');
      const y = requireFiniteNumber(params.y, 'y');
      return computerMouseMove(x, y);
    },

    async computer_drag(params = {}) {
      const startX = requireFiniteNumber(params.start_x, 'start_x');
      const startY = requireFiniteNumber(params.start_y, 'start_y');
      const endX = requireFiniteNumber(params.end_x, 'end_x');
      const endY = requireFiniteNumber(params.end_y, 'end_y');
      return computerDrag(startX, startY, endX, endY, normalizeDurationMs(params.duration_ms));
    },

    async computer_scroll(params = {}) {
      return computerScroll(normalizeDirection(params.direction), normalizeAmount(params.amount));
    },

    async computer_list_windows() {
      return listWindows();
    },

    async computer_focus_window(params = {}) {
      if (!params.title) {
        throw new Error(strings.errors.requiredTitle);
      }

      return focusWindow(String(params.title));
    },

    async computer_get_active_window() {
      return getActiveWindow();
    },

    async computer_window_action(params = {}) {
      if (!params.title) {
        throw new Error(strings.errors.requiredTitle);
      }

      if (!params.action) {
        throw new Error(strings.errors.requiredAction);
      }

      return controlWindow(String(params.title), String(params.action));
    },

    async computer_set_window_bounds(params = {}) {
      if (!params.title) {
        throw new Error(strings.errors.requiredTitle);
      }

      return setWindowBounds(String(params.title), normalizeWindowBounds(params));
    },

    async computer_get_clipboard() {
      return getClipboardText();
    },

    async computer_get_clipboard_info() {
      return getClipboardInfo();
    },

    async computer_set_clipboard(params = {}) {
      if (params.text == null) {
        throw new Error(strings.errors.requiredText);
      }

      return setClipboardText(String(params.text));
    },

    async computer_copy_selection() {
      return copySelection();
    },

    async computer_paste() {
      return pasteClipboard();
    },

    async computer_select_all() {
      return selectAll();
    },

    async computer_open_target(params = {}) {
      if (!params.target) {
        throw new Error(strings.errors.requiredTarget);
      }

      return openComputerTarget(String(params.target));
    },

    async computer_wait(params = {}) {
      const milliseconds = normalizeWaitMs(params.milliseconds);
      await delay(milliseconds);

      return {
        ok: true,
        output: strings.output.waited.replace('{milliseconds}', String(milliseconds)),
      };
    },
  };
}
