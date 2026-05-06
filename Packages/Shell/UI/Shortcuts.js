/**
 * Global keyboard shortcut registry for the Shell.
 *
 * All registered shortcuts use Ctrl+key or Ctrl+Shift+key combos. These are
 * app-level navigation bindings that must fire regardless of where focus is,
 * including inside the chat composer textarea.
 *
 * @typedef {{ key: string, ctrl?: boolean, shift?: boolean, alt?: boolean }} KeyCombo
 * @typedef {{ id: string, combo: KeyCombo, handler: () => void }} ShortcutDef
 */

/**
 * Registers global keyboard shortcuts and returns a disposable handle.
 *
 * @param {ShortcutDef[]} definitions
 * @returns {{ destroy: () => void }}
 */
export function registerShortcuts(definitions) {
  function matches(e, combo) {
    return (
      e.key.toLowerCase() === combo.key.toLowerCase() &&
      !!e.ctrlKey  === !!combo.ctrl  &&
      !!e.shiftKey === !!combo.shift &&
      !!e.altKey   === !!combo.alt
    );
  }

  function onKeyDown(e) {
    for (const def of definitions) {
      if (matches(e, def.combo)) {
        e.preventDefault();
        def.handler();
        return;
      }
    }
  }

  document.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      document.removeEventListener('keydown', onKeyDown);
    }
  };
}
