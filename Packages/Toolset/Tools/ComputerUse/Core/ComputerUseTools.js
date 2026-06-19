import strings from '../I18n/en.js';
import { computerKeyPress, computerTypeText } from './KeyboardTools.js';
import { computerClick, computerMouseMove, computerScroll } from './MouseTools.js';
import { captureScreenshot, getScreenInfo } from './ScreenTools.js';
import { focusWindow, listWindows } from './WindowTools.js';

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

export function createComputerUseToolHandlers() {
  return {
    async computer_screenshot(params = {}) {
      return captureScreenshot(params.window_title ? String(params.window_title) : '');
    },

    async computer_get_screen_info() {
      return getScreenInfo();
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
  };
}
