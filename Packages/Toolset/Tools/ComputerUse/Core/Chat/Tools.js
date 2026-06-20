export const COMPUTER_USE_TOOLS = [
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
    name: 'computer_get_cursor_position',
    description:
      'Get the current mouse cursor position in screen coordinates. Use this to inspect where the pointer is before moving, dragging, clicking, or scrolling.',
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
    name: 'computer_drag',
    description:
      'Drag from one screen coordinate to another. Always take a screenshot first and use this for sliders, selections, drag-and-drop, and resizing handles.',
    parameters: {
      start_x: {
        type: 'number',
        required: true,
        description: 'Starting horizontal screen coordinate in pixels.',
      },
      start_y: {
        type: 'number',
        required: true,
        description: 'Starting vertical screen coordinate in pixels.',
      },
      end_x: {
        type: 'number',
        required: true,
        description: 'Ending horizontal screen coordinate in pixels.',
      },
      end_y: {
        type: 'number',
        required: true,
        description: 'Ending vertical screen coordinate in pixels.',
      },
      duration_ms: {
        type: 'number',
        required: false,
        description: 'Drag duration in milliseconds. Default 500, maximum 5000.',
      },
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
    name: 'computer_get_active_window',
    description:
      'Get details about the currently active foreground window, including title, process, and state when available.',
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
  {
    name: 'computer_window_action',
    description:
      'Minimize, maximize, or restore a visible application window by title substring. Use list_windows first to find the title.',
    parameters: {
      title: {
        type: 'string',
        required: true,
        description: 'Substring of the window title to match (case-insensitive).',
      },
      action: {
        type: 'string',
        required: true,
        description: 'Window action: minimize, maximize, or restore.',
      },
    },
  },
  {
    name: 'computer_set_window_bounds',
    description:
      'Move and resize a visible application window by title substring. Use list_windows first to find the title and screen coordinates.',
    parameters: {
      title: {
        type: 'string',
        required: true,
        description: 'Substring of the window title to match (case-insensitive).',
      },
      x: {
        type: 'number',
        required: true,
        description: 'New window left coordinate in screen pixels.',
      },
      y: {
        type: 'number',
        required: true,
        description: 'New window top coordinate in screen pixels.',
      },
      width: {
        type: 'number',
        required: true,
        description: 'New window width in pixels.',
      },
      height: {
        type: 'number',
        required: true,
        description: 'New window height in pixels.',
      },
    },
  },
  {
    name: 'computer_get_clipboard',
    description:
      'Read the current text clipboard contents. Use this when the user asks to inspect copied text or verify clipboard state.',
    parameters: {},
  },
  {
    name: 'computer_get_clipboard_info',
    description:
      'Inspect clipboard metadata without returning clipboard text. Reports whether text or image data is present, text length, image size, and available clipboard formats.',
    parameters: {},
  },
  {
    name: 'computer_set_clipboard',
    description:
      'Set the system text clipboard. Prefer this before paste operations when entering long or special-character text.',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to place on the clipboard.' },
    },
  },
  {
    name: 'computer_copy_selection',
    description:
      'Copy the currently selected text or item to the system clipboard using the platform copy shortcut. Use after selecting content in the active app.',
    parameters: {},
  },
  {
    name: 'computer_paste',
    description:
      'Paste the current clipboard contents into the focused app using the platform paste shortcut. Use computer_set_clipboard first for controlled text entry.',
    parameters: {},
  },
  {
    name: 'computer_select_all',
    description:
      'Select all content in the focused field or view using the platform select-all shortcut.',
    parameters: {},
  },
  {
    name: 'computer_open_target',
    description:
      'Open a local file, folder, application path, or URL with the operating system default handler.',
    parameters: {
      target: {
        type: 'string',
        required: true,
        description: 'Absolute local path or URL to open.',
      },
    },
  },
  {
    name: 'computer_wait',
    description:
      'Wait for a short period before the next computer-use action. Use this after launching apps, loading pages, or triggering animations.',
    parameters: {
      milliseconds: {
        type: 'number',
        required: false,
        description: 'Milliseconds to wait. Default 1000, maximum 30000.',
      },
    },
  },
];
