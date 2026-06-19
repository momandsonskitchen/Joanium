import strings from '../I18n/en.js';
import {
  formatError,
  getPlatform,
  quoteAppleScript,
  quotePowerShell,
  requireMacOS,
  requireWindows,
  runCommand,
  runAppleScript,
  runPowerShell,
} from './Platform.js';

function mapKeyToWindows(key) {
  const map = {
    enter: '{ENTER}',
    tab: '{TAB}',
    escape: '{ESC}',
    backspace: '{BACKSPACE}',
    delete: '{DELETE}',
    up: '{UP}',
    down: '{DOWN}',
    left: '{LEFT}',
    right: '{RIGHT}',
    home: '{HOME}',
    end: '{END}',
    pageup: '{PGUP}',
    pagedown: '{PGDN}',
    f1: '{F1}',
    f2: '{F2}',
    f3: '{F3}',
    f4: '{F4}',
    f5: '{F5}',
    f6: '{F6}',
    f7: '{F7}',
    f8: '{F8}',
    f9: '{F9}',
    f10: '{F10}',
    f11: '{F11}',
    f12: '{F12}',
    capslock: '{CAPSLOCK}',
    numlock: '{NUMLOCK}',
    printscreen: '{PRTSC}',
    insert: '{INSERT}',
    space: ' ',
  };
  return map[key.toLowerCase()] ?? key;
}

function parseWindowsKeyCombo(keys) {
  const parts = String(keys)
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const modifiers = [];
  const mainKey = [];

  for (const part of parts) {
    if (['ctrl', 'control'].includes(part)) {
      modifiers.push('^');
    } else if (['alt', 'option'].includes(part)) {
      modifiers.push('%');
    } else if (part === 'shift') {
      modifiers.push('+');
    } else if (['win', 'meta', 'command', 'cmd'].includes(part)) {
      modifiers.push('^');
    } else {
      mainKey.push(part);
    }
  }

  const key = mainKey.length > 0 ? mainKey.at(-1) : '';
  return `${modifiers.join('')}${mapKeyToWindows(key)}`;
}

function mapKeyToLinux(key) {
  const map = {
    enter: 'Return',
    return: 'Return',
    tab: 'Tab',
    escape: 'Escape',
    backspace: 'BackSpace',
    delete: 'Delete',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    home: 'Home',
    end: 'End',
    pageup: 'Page_Up',
    pagedown: 'Page_Down',
    capslock: 'Caps_Lock',
    numlock: 'Num_Lock',
    printscreen: 'Print',
    insert: 'Insert',
    space: 'space',
  };
  return map[key.toLowerCase()] ?? key;
}

function parseLinuxKeyCombo(keys) {
  const parts = String(keys)
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const modifiers = [];
  const mainKey = [];

  for (const part of parts) {
    const normalized = part.toLowerCase();

    if (['ctrl', 'control'].includes(normalized)) {
      modifiers.push('ctrl');
    } else if (['alt', 'option'].includes(normalized)) {
      modifiers.push('alt');
    } else if (normalized === 'shift') {
      modifiers.push('shift');
    } else if (['win', 'meta', 'command', 'cmd'].includes(normalized)) {
      modifiers.push('Super');
    } else {
      mainKey.push(part);
    }
  }

  const key = mainKey.length > 0 ? mainKey.at(-1) : '';
  return [...modifiers, mapKeyToLinux(key)].filter(Boolean).join('+');
}

async function windowsTypeText(text) {
  requireWindows();
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $text = ${quotePowerShell(text)}
    [System.Windows.Forms.SendKeys]::SendWait($text)
  `;

  await runPowerShell(psScript, 10000);
}

async function macosTypeText(text) {
  requireMacOS();
  const osascript = `
    tell application "System Events"
      keystroke ${quoteAppleScript(text)}
    end tell
  `;

  await runAppleScript(osascript, 10000);
}

async function linuxTypeText(text) {
  await runCommand('xdotool', ['type', '--delay', '0', text], 10000);
}

export async function computerTypeText(text) {
  try {
    const platform = getPlatform();
    if (platform === 'win32') {
      await windowsTypeText(text);
    } else if (platform === 'darwin') {
      await macosTypeText(text);
    } else if (platform === 'linux') {
      await linuxTypeText(text);
    } else {
      return { ok: false, error: strings.errors.platformNotSupported };
    }

    return {
      ok: true,
      output: strings.output.typed.replace('{length}', String(String(text).length)),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.typeFailed.replace('{error}', formatError(error)),
    };
  }
}

async function windowsKeyPress(keys) {
  requireWindows();
  const mapped = parseWindowsKeyCombo(keys);
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait(${quotePowerShell(mapped)})
  `;

  await runPowerShell(psScript);
}

async function macosKeyPress(keys) {
  requireMacOS();
  const parts = String(keys)
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const modifiers = [];
  const mainKey = [];

  for (const part of parts) {
    if (['command', 'cmd', 'meta'].includes(part)) {
      modifiers.push('command');
    } else if (['option', 'alt'].includes(part)) {
      modifiers.push('option');
    } else if (['control', 'ctrl'].includes(part)) {
      modifiers.push('control');
    } else if (part === 'shift') {
      modifiers.push('shift');
    } else {
      mainKey.push(part);
    }
  }

  const key = mainKey.length > 0 ? mainKey.at(-1) : '';
  const keyMap = {
    enter: 'return',
    return: 'return',
    tab: 'tab',
    escape: 'escape',
    delete: 'delete',
    backspace: 'delete',
    up: 'up arrow',
    down: 'down arrow',
    left: 'left arrow',
    right: 'right arrow',
    space: 'space',
  };
  const mapped = keyMap[key] ?? key;
  const modifierString = modifiers.length > 0 ? ` using {${modifiers.join(', ')}}` : '';
  const osascript = `
    tell application "System Events"
      keystroke ${quoteAppleScript(mapped)}${modifierString}
    end tell
  `;

  await runAppleScript(osascript);
}

async function linuxKeyPress(keys) {
  await runCommand('xdotool', ['key', parseLinuxKeyCombo(keys)], 3000);
}

export async function computerKeyPress(keys) {
  try {
    const platform = getPlatform();
    if (platform === 'win32') {
      await windowsKeyPress(keys);
    } else if (platform === 'darwin') {
      await macosKeyPress(keys);
    } else if (platform === 'linux') {
      await linuxKeyPress(keys);
    } else {
      return { ok: false, error: strings.errors.platformNotSupported };
    }

    return {
      ok: true,
      output: strings.output.keyPressed.replace('{keys}', keys),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.keyFailed.replace('{error}', formatError(error)),
    };
  }
}
