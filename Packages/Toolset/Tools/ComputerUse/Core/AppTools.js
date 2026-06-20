import { shell } from 'electron';
import strings from '../I18n/en.js';
import { formatError } from './Platform.js';

function isExternalUrl(target) {
  try {
    const url = new URL(target);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export async function openComputerTarget(target) {
  try {
    const normalized = String(target ?? '').trim();

    if (!normalized) {
      throw new Error(strings.errors.requiredTarget);
    }

    if (isExternalUrl(normalized)) {
      await shell.openExternal(normalized);
    } else {
      const errorMessage = await shell.openPath(normalized);
      if (errorMessage) {
        throw new Error(errorMessage);
      }
    }

    return {
      ok: true,
      output: strings.output.targetOpened.replace('{target}', normalized),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.openTargetFailed.replace('{error}', formatError(error)),
    };
  }
}
