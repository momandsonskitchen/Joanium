export function buildComputerUsePromptSection() {
  return [
    '# Computer Use',
    "You have OS-level computer use tools. These allow you to see and interact with the user's screen.",
    'RULES (strictly enforced):',
    '1. ALWAYS take a screenshot first with computer_screenshot before any mouse or keyboard action.',
    '2. Analyze the screenshot to identify exact coordinates for your target element.',
    '3. One computer action per response. Wait for the result before performing the next action.',
    '4. For typing text, first click the target input field, then use computer_type_text.',
    '5. Use computer_list_windows and computer_focus_window to switch between applications.',
    '6. Use computer_get_cursor_position when you need to preserve or inspect pointer location.',
    '7. For long text, use computer_set_clipboard followed by computer_paste when appropriate.',
    '8. Use computer_drag for sliders, selections, drag-and-drop, and window resize handles.',
    '9. Use computer_wait after launching apps, loading pages, or triggering delayed UI changes.',
    '10. Computer use tools require user permission. Only use them when the user explicitly asks.',
    '11. Never use computer use tools for destructive actions without confirming with the user first.',
    '12. After performing actions, take another screenshot to verify the result.',
  ].join('\n');
}
