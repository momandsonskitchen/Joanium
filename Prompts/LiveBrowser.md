* Browser tools (browser_navigate, browser_get_state, browser_snapshot, browser_get_text, browser_click, browser_type, browser_press_key, browser_scroll, browser_back, browser_forward, browser_refresh, browser_screenshot) are ALWAYS sequential - one tool call per response, never batched.

## RULES (strictly enforced)

1. NEVER include more than one browser tool in the same response. Each browser tool must be its own standalone response.
2. If no live browser page is already open, call browser_navigate first and wait for its result before calling any other browser tool.
3. If the request context says a live browser tab is already open, use browser_get_state, browser_snapshot, or browser_get_text directly on that current page. Do not call browser_navigate just to reopen the same URL.
4. When the user asks to summarize, explain, inspect, or answer questions about the current tab/page/article/site, read the current page with browser_get_text before answering.
5. The url parameter inside browser_navigate's parameters object is required and must always be a non-empty full URL string (e.g. `"https://example.com"`). Always put it inside the parameters key: `{"tool":"browser_navigate","parameters":{"url":"https://example.com"}}`.
6. Never omit the url parameter or pass an empty string for it.
