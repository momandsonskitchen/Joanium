const en = {
  browserPreview: {
    fallbackTitle: 'Browser Preview',
    noPageLoaded: '(no page loaded)',
    untitled: '(untitled)',
    noVisibleText: '(no visible text)',
    noneVisible: '- none visible',
    elementFallback: 'element',
    yes: 'yes',
    no: 'no',
    stateLabels: {
      title: 'Title',
      url: 'URL',
      visible: 'Visible',
      loading: 'Loading',
      status: 'Status',
    },
    status: {
      ready: 'Ready',
      loading: 'Loading page...',
      opening: 'Opening {url}',
      loadFailed: 'Load failed ({code}): {description}',
      processEnded: 'Browser process ended unexpectedly.',
    },
    messages: {
      page: 'Page: {title}',
      visibleElements: 'Visible interactive elements:',
      elementLine: '- {id} [{role}] {label}{state}',
      disabledState: ' disabled',
      pageTextExcerpt: 'Page text excerpt:',
      clicked: 'Clicked {role}: {label}',
      typed: 'Typed into {label}.',
      pressedKey: 'Pressed key: {key}',
      scrolled: 'Scrolled {direction}{amount}.',
      scrollAmount: ' by {amount}px',
      screenshotSaved: 'Screenshot saved: {path}',
      opened: 'Opened {url}',
    },
    errors: {
      urlRequired: 'A URL is required.',
      pageRequired: 'No browser page is loaded. Use browser_navigate first.',
      pageUnavailable: 'Browser page is not available.',
      createPreviewFailed: 'Could not create the browser preview.',
      elementNotFound: 'Element not found.',
      textFieldNotFound: 'Text field not found.',
      elementCannotReceiveText: 'Element cannot receive text.',
      noScrollTarget: 'No scroll target found.',
      readTextFailed: 'Could not read browser text.',
      targetRequired: 'Missing required parameter: target.',
      keyRequired: 'Missing required parameter: key.',
      clickFailed: 'Click failed.',
      typingFailed: 'Typing failed.',
      scrollFailed: 'Scroll failed.',
      unsupportedTool: 'Unsupported browser tool.',
    },
  },
  tools: [
    {
      name: 'browser_navigate',
      description: 'Open a URL in the live browser preview on the right side of chat.',
      category: 'browser',
      parameters: {
        url: { type: 'string', required: true, description: 'URL to open. A scheme is optional.' },
      },
    },
    {
      name: 'browser_get_state',
      description: 'Get the live browser title, URL, loading state, and status.',
      category: 'browser',
      parameters: {},
    },
    {
      name: 'browser_snapshot',
      description:
        'Read the current page and list visible interactive elements with stable ids such as ow-1.',
      category: 'browser',
      parameters: {},
    },
    {
      name: 'browser_get_text',
      description: 'Read visible text from the whole page or a target element in the live browser.',
      category: 'browser',
      parameters: {
        target: {
          type: 'string',
          required: false,
          description: 'Stable id, CSS selector, label text, or empty for page body.',
        },
      },
    },
    {
      name: 'browser_click',
      description:
        'Click a visible browser element by stable id, CSS selector, or visible label text.',
      category: 'browser',
      parameters: {
        target: {
          type: 'string',
          required: true,
          description: 'Stable id, CSS selector, or label text.',
        },
      },
    },
    {
      name: 'browser_type',
      description: 'Type text into a browser input, textarea, select, or contenteditable element.',
      category: 'browser',
      parameters: {
        target: {
          type: 'string',
          required: true,
          description: 'Stable id, CSS selector, or label text.',
        },
        text: { type: 'string', required: true, description: 'Text to type.' },
        clear_first: {
          type: 'boolean',
          required: false,
          description: 'Clear existing value before typing. Defaults to true.',
        },
        press_enter: { type: 'boolean', required: false, description: 'Press Enter after typing.' },
      },
    },
    {
      name: 'browser_press_key',
      description:
        'Send a keyboard key such as Enter, Tab, Escape, or ArrowDown to the live browser.',
      category: 'browser',
      parameters: {
        key: { type: 'string', required: true, description: 'Keyboard key to press.' },
        target: { type: 'string', required: false, description: 'Optional target to focus first.' },
      },
    },
    {
      name: 'browser_scroll',
      description: 'Scroll the browser page or a target element.',
      category: 'browser',
      parameters: {
        direction: {
          type: 'string',
          required: false,
          description: 'up, down, left, right, top, or bottom. Defaults to down.',
        },
        amount: {
          type: 'number',
          required: false,
          description: 'Pixels to scroll. Defaults to 600.',
        },
        target: {
          type: 'string',
          required: false,
          description: 'Optional stable id, selector, or label for a scrollable element.',
        },
      },
    },
    {
      name: 'browser_back',
      description: 'Go back in the live browser history.',
      category: 'browser',
      parameters: {},
    },
    {
      name: 'browser_forward',
      description: 'Go forward in the live browser history.',
      category: 'browser',
      parameters: {},
    },
    {
      name: 'browser_refresh',
      description: 'Reload the current live browser page.',
      category: 'browser',
      parameters: {},
    },
    {
      name: 'browser_screenshot',
      description: 'Capture the current live browser page to a PNG under Data/Screenshots.',
      category: 'browser',
      parameters: {
        file_name: { type: 'string', required: false, description: 'Optional PNG filename.' },
      },
    },
  ],
};

export default en;
