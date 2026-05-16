import {
  createBrowserPreviewService,
  LIVE_BROWSER_TOOL_NAMES,
} from './Core/BrowserPreviewService.js';
import { getBrowserPreviewService, setBrowserPreviewService } from './Core/BrowserRuntime.js';
import strings from './I18n/en.js';

function ownerWindow(event) {
  return event?.sender?.getOwnerBrowserWindow?.() ?? null;
}

export async function createPackage({ rootDirectory }) {
  const browserPreviewService = createBrowserPreviewService({ rootDirectory });
  setBrowserPreviewService(browserPreviewService);

  return {
    id: 'LiveBrowser',
    ipcHandlers: [
      {
        channel: 'browser-preview:get-state',
        handler: async (event) => {
          browserPreviewService.attachToWindow(ownerWindow(event));
          return browserPreviewService.getState();
        },
      },
      {
        channel: 'browser-preview:load-url',
        handler: async (event, url) => browserPreviewService.loadUrl(url, ownerWindow(event)),
      },
      {
        channel: 'browser-preview:set-visible',
        handler: async (event, visible) =>
          browserPreviewService.setVisible(visible, ownerWindow(event)),
      },
      {
        channel: 'browser-preview:set-bounds',
        handler: async (event, bounds) =>
          browserPreviewService.setHostBounds(bounds, ownerWindow(event)),
      },
      {
        channel: 'browser-preview:hide',
        handler: async () => browserPreviewService.hide(),
      },
      {
        channel: 'browser-preview:go-back',
        handler: async () => browserPreviewService.goBack(),
      },
      {
        channel: 'browser-preview:go-forward',
        handler: async () => browserPreviewService.goForward(),
      },
      {
        channel: 'browser-preview:reload',
        handler: async () => browserPreviewService.reload(),
      },
      {
        channel: 'browser-preview:pause',
        handler: async () => browserPreviewService.pauseView(),
      },
      {
        channel: 'browser-preview:resume',
        handler: async (event) => {
          browserPreviewService.attachToWindow(ownerWindow(event));
          browserPreviewService.resumeView();
        },
      },
      {
        channel: 'browser-preview:close',
        handler: async () => browserPreviewService.close(),
      },
    ],
  };
}

export function createToolPackage() {
  return {
    id: 'live-browser',
    toolDefinitions: strings.tools,
    toolHandlers: Object.fromEntries(
      LIVE_BROWSER_TOOL_NAMES.map((toolName) => [
        toolName,
        async (parameters = {}, context = {}) =>
          getBrowserPreviewService().executeTool(toolName, parameters, context),
      ]),
    ),
  };
}

export default createToolPackage;
