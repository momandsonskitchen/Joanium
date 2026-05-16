const en = {
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
