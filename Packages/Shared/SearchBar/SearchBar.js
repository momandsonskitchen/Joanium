// ══════════════════════════════════════════════════════════════════════════
//  Joanium — SearchBar shared component
//  Factory that builds a self-contained search input with a magnifier icon
//  and an animated clear (×) button.
//
//  Usage:
//    import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
//
//    const search = createSearchBar({
//      placeholder: 'Search…',
//      onChange: (value) => filterList(value),
//    });
//    container.append(search.element);
//
//  API returned:
//    search.element   — the root DOM node to insert
//    search.getValue() — current input value
//    search.setValue(v) — set value programmatically (syncs clear btn)
//    search.clear()     — empty the field (fires onChange)
//    search.focus()     — focus the input
// ══════════════════════════════════════════════════════════════════════════

const SEARCH_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
  </svg>
`;

const CLEAR_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
`;

/**
 * @param {object}   options
 * @param {string}   [options.placeholder='']   Input placeholder text.
 * @param {function} [options.onChange]          Called with the current string on every keystroke.
 * @param {function} [options.onClear]           Called when the clear button is pressed (after reset).
 * @param {function} [options.onKeyDown]         Raw keydown handler forwarded from the input.
 * @returns {{ element: HTMLElement, getValue(): string, setValue(v: string): void, clear(): void, focus(): void }}
 */
export function createSearchBar({ placeholder = '', onChange, onClear, onKeyDown } = {}) {
  // ── Root wrapper ──────────────────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.className = 'joanium-search';

  // ── Magnifier icon ────────────────────────────────────────────────────
  const iconEl = document.createElement('span');
  iconEl.className = 'joanium-search__icon';
  iconEl.innerHTML = SEARCH_ICON;

  // ── Input ─────────────────────────────────────────────────────────────
  const input = document.createElement('input');
  input.className = 'joanium-search__input';
  input.type = 'text';
  input.placeholder = placeholder;

  // ── Clear button ──────────────────────────────────────────────────────
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'joanium-search__clear';

  const clearIconEl = document.createElement('span');
  clearIconEl.className = 'joanium-search__clear-icon';
  clearIconEl.innerHTML = CLEAR_ICON;
  clearBtn.append(clearIconEl);

  // ── Sync helpers ──────────────────────────────────────────────────────

  function syncClearVisibility() {
    clearBtn.classList.toggle('joanium-search__clear--visible', input.value.length > 0);
  }

  // ── Events ────────────────────────────────────────────────────────────

  input.addEventListener('input', () => {
    syncClearVisibility();
    onChange?.(input.value);
  });

  if (typeof onKeyDown === 'function') {
    input.addEventListener('keydown', onKeyDown);
  }

  clearBtn.addEventListener('click', () => {
    input.value = '';
    syncClearVisibility();
    onChange?.('');
    onClear?.();
    input.focus();
  });

  // ── Assemble ──────────────────────────────────────────────────────────
  wrap.append(iconEl, input, clearBtn);

  // ── Public API ────────────────────────────────────────────────────────
  return {
    element:  wrap,
    getValue: ()  => input.value,
    setValue: (v) => { input.value = String(v ?? ''); syncClearVisibility(); },
    clear:    ()  => { input.value = ''; syncClearVisibility(); onChange?.(''); },
    focus:    ()  => input.focus()
  };
}
