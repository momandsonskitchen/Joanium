import { desktopCapturer, screen } from 'electron';
import strings from '../I18n/en.js';
import { formatError, toJsonOutput } from './Platform.js';

async function captureWindowScreenshot(windowTitle) {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1920, height: 1080 },
  });
  const match = sources.find((source) =>
    source.name.toLowerCase().includes(windowTitle.toLowerCase()),
  );

  if (!match) {
    throw new Error(strings.errors.windowNotFound.replace('{title}', windowTitle));
  }

  return match.thumbnail;
}

async function capturePrimaryDisplayScreenshot() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });
  const screenSource = sources[0];

  if (!screenSource) {
    throw new Error(strings.errors.permissionDenied);
  }

  return screenSource.thumbnail;
}

export async function captureScreenshot(windowTitle) {
  try {
    const thumbnail = windowTitle
      ? await captureWindowScreenshot(windowTitle)
      : await capturePrimaryDisplayScreenshot();
    const base64 = thumbnail.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

    return {
      ok: true,
      output: strings.output.screenshotTaken,
      image: base64,
      width: thumbnail.getWidth(),
      height: thumbnail.getHeight(),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.screenshotFailed.replace('{error}', formatError(error)),
    };
  }
}

export async function getScreenInfo() {
  try {
    const primaryDisplayId = screen.getPrimaryDisplay().id;
    const displays = screen.getAllDisplays().map((display, index) => ({
      index,
      id: display.id,
      label: display.label || strings.output.display.replace('{index}', String(index + 1)),
      resolution: `${display.size.width}x${display.size.height}`,
      scaleFactor: display.scaleFactor,
      isPrimary: display.id === primaryDisplayId,
      bounds: {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
      },
    }));

    return {
      ok: true,
      output: toJsonOutput(displays),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.screenInfoFailed.replace('{error}', formatError(error)),
    };
  }
}

export async function getCursorPosition() {
  try {
    const point = screen.getCursorScreenPoint();

    return {
      ok: true,
      output: toJsonOutput(point),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.cursorPositionFailed.replace('{error}', formatError(error)),
    };
  }
}
