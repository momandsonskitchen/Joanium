let browserPreviewService = null;

export function setBrowserPreviewService(service) {
  browserPreviewService = service ?? null;
  return browserPreviewService;
}

export function getBrowserPreviewService() {
  if (!browserPreviewService) {
    throw new Error('Live browser is not initialized.');
  }

  return browserPreviewService;
}
