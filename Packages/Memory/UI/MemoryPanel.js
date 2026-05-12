import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';

export function createMemoryPanel(strings) {
  let panel = null;
  let listEl = null;
  let search = null;
  let editor = null;
  let filenameEl = null;
  let descriptionEl = null;
  let saveButton = null;
  let activeFilename = null;
  let activeMemory = null;

  async function populateList(query = '') {
    if (!listEl) return;
    listEl.replaceChildren();

    for (let i = 0; i < 4; i++) {
      listEl.append(createElement('div', 'chat-memory__skeleton'));
    }

    let memories = [];
    try {
      memories = await invokeIpc('memory:list');
    } catch {
      memories = [];
    }

    const normalizedQuery = collapseWhitespace(query).toLowerCase();
    const filtered = normalizedQuery
      ? memories.filter((memory) => {
          const haystack = [memory.filename, memory.title, memory.description]
            .map((value) => collapseWhitespace(value).toLowerCase())
            .join('\n');
          return haystack.includes(normalizedQuery);
        })
      : memories;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-memory__empty');
      empty.append(
        createElement(
          'p',
          'chat-memory__empty-title',
          normalizedQuery ? strings.noResults : strings.empty,
        ),
        createElement(
          'p',
          'chat-memory__empty-hint',
          normalizedQuery ? strings.noResultsHint : strings.emptyHint,
        ),
      );
      listEl.append(empty);
      return;
    }

    for (const memory of filtered) {
      listEl.append(buildMemoryCard(memory));
    }
  }

  function buildMemoryCard(memory) {
    const card = createElement(
      'button',
      `chat-memory__card${activeFilename === memory.filename ? ' chat-memory__card--active' : ''}`,
    );
    card.type = 'button';
    card.append(
      createElement('span', 'chat-memory__card-title', memory.title),
      createElement(
        'span',
        'chat-memory__card-meta',
        formatText(strings.stats, {
          lines: String(memory.lineCount ?? 0),
        }),
      ),
    );
    card.addEventListener('click', () => {
      void loadMemory(memory.filename);
    });
    return card;
  }

  function renderEmptyEditor() {
    activeFilename = null;
    activeMemory = null;
    if (filenameEl) filenameEl.textContent = '';
    if (descriptionEl) descriptionEl.textContent = strings.emptyEditor;
    if (editor) {
      editor.value = '';
      editor.disabled = true;
    }
    if (saveButton) saveButton.disabled = true;
  }

  function setSaveButtonText(text) {
    const label = saveButton?.querySelector('.chat-memory__save-label');
    if (label) {
      label.textContent = text;
    } else if (saveButton) {
      saveButton.textContent = text;
    }
  }

  async function loadMemory(filename) {
    try {
      activeMemory = await invokeIpc('memory:read', filename);
      activeFilename = activeMemory.filename;
    } catch {
      return;
    }

    if (filenameEl) filenameEl.textContent = activeMemory.filename;
    if (descriptionEl) descriptionEl.textContent = activeMemory.description;
    if (editor) {
      editor.disabled = false;
      editor.value = activeMemory.content;
      editor.focus();
    }
    if (saveButton) {
      saveButton.disabled = false;
      setSaveButtonText(strings.save);
    }

    await populateList(search?.getValue().trim() ?? '');
  }

  async function saveMemory() {
    if (!activeFilename || !editor || !saveButton) return;

    saveButton.disabled = true;
    setSaveButtonText(strings.saving);

    try {
      activeMemory = await invokeIpc('memory:save', activeFilename, editor.value);
      setSaveButtonText(strings.saved);
      setTimeout(() => {
        if (saveButton) {
          setSaveButtonText(strings.save);
          saveButton.disabled = false;
        }
      }, 1200);
      await loadMemory(activeMemory.filename);
    } catch {
      setSaveButtonText(strings.saveFailed);
      setTimeout(() => {
        if (saveButton) {
          setSaveButtonText(strings.save);
          saveButton.disabled = false;
        }
      }, 1600);
    }
  }

  function build() {
    if (panel) return panel;

    panel = createElement('div', 'chat-memory');
    panel.hidden = true;

    panel.append(createPanelHeader({ title: strings.title, subtitle: strings.subtitle }));

    const body = createElement('div', 'chat-memory__body');
    const listColumn = createElement('section', 'chat-memory__list-column');
    const editorColumn = createElement('section', 'chat-memory__editor-column');

    const searchWrap = createElement('div', 'chat-memory__search');
    search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => {
        void populateList(value.trim());
      },
    });
    searchWrap.append(search.element);
    listEl = createElement('div', 'chat-memory__list');
    listColumn.append(searchWrap, listEl);

    const editorHeader = createElement('div', 'chat-memory__editor-header');
    const editorMeta = createElement('div', 'chat-memory__editor-meta');
    filenameEl = createElement('h3', 'chat-memory__editor-title');
    descriptionEl = createElement('p', 'chat-memory__editor-description', strings.emptyEditor);
    editorMeta.append(filenameEl, descriptionEl);

    saveButton = createElement('button', 'chat-memory__save');
    saveButton.type = 'button';
    saveButton.disabled = true;
    saveButton.append(
      createIcon('check', 'chat-memory__save-icon'),
      createElement('span', 'chat-memory__save-label', strings.save),
    );
    saveButton.addEventListener('click', () => {
      void saveMemory();
    });
    editorHeader.append(editorMeta, saveButton);

    editor = createElement('textarea', 'chat-memory__editor');
    editor.setAttribute('aria-label', strings.editorLabel);
    editor.disabled = true;

    editorColumn.append(editorHeader, editor);
    body.append(listColumn, editorColumn);
    panel.append(body);
    renderEmptyEditor();
    return panel;
  }

  return {
    build,
    onShow: () => populateList(search?.getValue().trim() ?? ''),
  };
}
