import {
  createBrowserPreviewService,
  LIVE_BROWSER_TOOL_NAMES,
} from './Core/BrowserPreviewService.js';
import { getBrowserPreviewService, setBrowserPreviewService } from './Core/BrowserRuntime.js';
import strings from './I18n/en.js';

const BROWSER_TOOL_PROMPT = `Browser tools (browser_navigate, browser_get_state, browser_snapshot, browser_get_text, browser_click, browser_type, browser_press_key, browser_scroll, browser_back, browser_forward, browser_refresh, browser_screenshot) are ALWAYS sequential - one tool call per response, never batched.

RULES (strictly enforced):
1. NEVER include more than one browser tool in the same response. Each browser tool must be its own standalone response.
2. If no live browser page is already open, call browser_navigate first and wait for its result before calling any other browser tool.
3. If the request context says a live browser tab is already open, use browser_get_state, browser_snapshot, or browser_get_text directly on that current page. Do not call browser_navigate just to reopen the same URL.
4. When the user asks to summarize, explain, inspect, or answer questions about the current tab/page/article/site, read the current page with browser_get_text before answering.
5. The url parameter inside browser_navigate's parameters object is required and must always be a non-empty full URL string (e.g. "https://example.com"). Always put it inside the parameters key: {"tool":"browser_navigate","parameters":{"url":"https://example.com"}}.
6. Never omit the url parameter or pass an empty string for it.`;

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
    promptSections: [BROWSER_TOOL_PROMPT],
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
