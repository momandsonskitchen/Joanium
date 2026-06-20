import { clipboard } from 'electron';
import strings from '../I18n/en.js';
import { computerKeyPress } from './KeyboardTools.js';
import { formatError, getPlatform, toJsonOutput } from './Platform.js';

function pasteShortcut() {
  return getPlatform() === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
}

function copyShortcut() {
  return getPlatform() === 'darwin' ? 'Cmd+C' : 'Ctrl+C';
}

function selectAllShortcut() {
  return getPlatform() === 'darwin' ? 'Cmd+A' : 'Ctrl+A';
}

export async function getClipboardText() {
  try {
    const text = clipboard.readText();

    return {
      ok: true,
      output: text,
      length: text.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.clipboardReadFailed.replace('{error}', formatError(error)),
    };
  }
}

export async function getClipboardInfo() {
  try {
    const text = clipboard.readText();
    const image = clipboard.readImage();
    const imageSize = image.isEmpty() ? null : image.getSize();

    return {
      ok: true,
      output: toJsonOutput({
        hasText: text.length > 0,
        textLength: text.length,
        hasImage: !image.isEmpty(),
        imageSize,
        formats: clipboard.availableFormats(),
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.clipboardInfoFailed.replace('{error}', formatError(error)),
    };
  }
}

export async function copySelection() {
  const result = await computerKeyPress(copyShortcut());
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    output: strings.output.selectionCopied,
  };
}

export async function pasteClipboard() {
  const result = await computerKeyPress(pasteShortcut());
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    output: strings.output.clipboardPasted,
  };
}

export async function selectAll() {
  const result = await computerKeyPress(selectAllShortcut());
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    output: strings.output.selectedAll,
  };
}

export async function setClipboardText(text) {
  try {
    clipboard.writeText(String(text));

    return {
      ok: true,
      output: strings.output.clipboardWritten.replace('{length}', String(String(text).length)),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.clipboardWriteFailed.replace('{error}', formatError(error)),
    };
  }
}
