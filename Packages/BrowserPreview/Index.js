import { createBrowserPreviewService } from './Core/BrowserPreviewService.js';

const service = createBrowserPreviewService();

function ownerWindow(event) {
  return event?.sender?.getOwnerBrowserWindow?.() ?? null;
}

export async function createPackage() {
  return {
    id: 'BrowserPreview',
    ipcHandlers: [
      {
        channel: 'browser-preview:get-state',
        handler: async (event) => {
          service.attachToWindow(ownerWindow(event));
          return service.getState();
        }
      },
      {
        channel: 'browser-preview:load-url',
        handler: async (event, url) => service.loadUrl(url, ownerWindow(event))
      },
      {
        channel: 'browser-preview:set-visible',
        handler: async (event, visible) => service.setVisible(visible, ownerWindow(event))
      },
      {
        channel: 'browser-preview:set-bounds',
        handler: async (event, bounds) => service.setHostBounds(bounds, ownerWindow(event))
      },
      {
        channel: 'browser-preview:hide',
        handler: async () => service.hide()
      },
      {
        channel: 'browser-preview:go-back',
        handler: async () => service.goBack()
      },
      {
        channel: 'browser-preview:go-forward',
        handler: async () => service.goForward()
      },
      {
        channel: 'browser-preview:reload',
        handler: async () => service.reload()
      },
      {
        channel: 'browser-preview:close',
        handler: async () => service.close()
      }
    ]
  };
}
