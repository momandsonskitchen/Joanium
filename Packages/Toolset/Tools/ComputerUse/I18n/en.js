const computerUseStrings = {
  tools: [
    {
      name: 'computer_screenshot',
      description:
        'Capture a screenshot of the entire screen or a specific window. Returns a base64-encoded image for visual analysis. Use this to understand what is currently displayed on screen before performing any computer interaction.',
      parameters: {
        window_title: {
          type: 'string',
          required: false,
          description:
            'Optional window title to capture a specific window. Omit to capture the primary display.',
        },
      },
    },
    {
      name: 'computer_get_screen_info',
      description:
        'Get information about all connected displays including resolution, position, and whether each is the primary display. Use this to understand screen layout before clicking or typing.',
      parameters: {},
    },
    {
      name: 'computer_click',
      description:
        'Click at specific screen coordinates. Always take a screenshot first to identify the target location before clicking.',
      parameters: {
        x: {
          type: 'number',
          required: true,
          description: 'Horizontal screen coordinate in pixels.',
        },
        y: { type: 'number', required: true, description: 'Vertical screen coordinate in pixels.' },
        button: {
          type: 'string',
          required: false,
          description: 'Mouse button: left (default), right, or middle.',
        },
        double: {
          type: 'boolean',
          required: false,
          description: 'Double-click instead of single click. Default false.',
        },
      },
    },
    {
      name: 'computer_type_text',
      description:
        'Type text at the current cursor position. Use computer_click first to focus the target field, then type_text to enter text.',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to type.' },
        delay_ms: {
          type: 'number',
          required: false,
          description: 'Delay between keystrokes in milliseconds. Default 30.',
        },
      },
    },
    {
      name: 'computer_key_press',
      description:
        'Press a keyboard shortcut or key combination. Use for Enter, Tab, Escape, Copy (Ctrl+C), Paste (Ctrl+V), and other shortcuts.',
      parameters: {
        keys: {
          type: 'string',
          required: true,
          description:
            'Key combination using + separator. Examples: Enter, Tab, Escape, Ctrl+C, Ctrl+V, Alt+Tab, Ctrl+S, Ctrl+A.',
        },
      },
    },
    {
      name: 'computer_mouse_move',
      description: 'Move the mouse cursor to specific screen coordinates without clicking.',
      parameters: {
        x: {
          type: 'number',
          required: true,
          description: 'Horizontal screen coordinate in pixels.',
        },
        y: { type: 'number', required: true, description: 'Vertical screen coordinate in pixels.' },
      },
    },
    {
      name: 'computer_scroll',
      description: 'Scroll the mouse wheel at the current cursor position.',
      parameters: {
        direction: {
          type: 'string',
          required: false,
          description: 'Scroll direction: up (default) or down.',
        },
        amount: {
          type: 'number',
          required: false,
          description: 'Number of scroll notches. Default 3.',
        },
      },
    },
    {
      name: 'computer_list_windows',
      description:
        'List all visible application windows with their titles and positions. Use this to find a specific application to interact with.',
      parameters: {},
    },
    {
      name: 'computer_focus_window',
      description:
        'Bring a window to the foreground by its title substring. Use list_windows first to find the exact title.',
      parameters: {
        title: {
          type: 'string',
          required: true,
          description: 'Substring of the window title to match (case-insensitive).',
        },
      },
    },
  ],
  errors: {
    screenshotFailed: 'Failed to capture screenshot: {error}',
    platformNotSupported: 'Computer use is not supported on this platform.',
    permissionDenied: 'Screen recording permission is required for screenshots.',
    windowNotFound: 'No window matching "{title}" was found.',
    clickFailed: 'Click failed: {error}',
    typeFailed: 'Type failed: {error}',
    keyFailed: 'Key press failed: {error}',
    scrollFailed: 'Scroll failed: {error}',
    windowListFailed: 'Failed to list windows: {error}',
    focusFailed: 'Failed to focus window: {error}',
    screenInfoFailed: 'Failed to get screen info: {error}',
    requiredNumber: '{label} must be a finite number.',
    requiredText: 'Text parameter is required.',
    requiredKeys: 'Keys parameter is required.',
    requiredTitle: 'Title parameter is required.',
    invalidButton: 'Button must be left, right, or middle.',
    invalidDirection: 'Direction must be up or down.',
  },
  output: {
    screenshotTaken: 'Screenshot captured successfully.',
    screenInfo: 'Screen information',
    windowsListed: 'Visible windows',
    windowFocused: 'Window "{title}" brought to foreground.',
    clicked: 'Clicked at ({x}, {y}).',
    typed: 'Typed {length} characters.',
    keyPressed: 'Pressed {keys}.',
    mouseMoved: 'Mouse moved to ({x}, {y}).',
    scrolled: 'Scrolled {direction} by {amount} notches.',
    display: 'Display {index}',
    primary: 'Primary',
    resolution: 'Resolution',
    position: 'Position',
    title: 'Title',
    bounds: 'Bounds',
    noWindows: 'No visible windows found.',
    untitled: 'Untitled',
    appProcess: 'Joanium',
    externalProcess: 'External app',
  },
};

export default computerUseStrings;
