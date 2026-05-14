import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';

function extractJsonObject(text = '') {
  const source = String(text ?? '').trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  return start < 0 || end <= start ? null : source.slice(start, end + 1);
}

function normalizeMemoryEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const filename = String(entry.filename ?? '').trim();
  const content = String(entry.content ?? '').trim();
  return filename && content ? { filename, content } : null;
}

function normalizeImportPayload(payload = {}) {
  return {
    updates: (Array.isArray(payload.updates) ? payload.updates : [])
      .map(normalizeMemoryEntry)
      .filter(Boolean),
    newFiles: (Array.isArray(payload.newFiles) ? payload.newFiles : [])
      .map(normalizeMemoryEntry)
      .filter(Boolean),
  };
}

function buildImportCatalogBlock(catalog = [], emptyLabel) {
  if (!Array.isArray(catalog) || catalog.length === 0) return emptyLabel;
  return catalog
    .map((entry) => {
      const content = String(entry.content ?? '').trim() || emptyLabel;
      return [`--- ${entry.filename} ---`, content].join('\n');
    })
    .join('\n\n');
}

function providerIsConfigured(provider, details = {}) {
  const endpoint = String(details.endpoint ?? provider.endpoint ?? '').trim();
  if (!endpoint) return false;
  if (provider.requiresApiKey && !String(details.apiKey ?? '').trim()) return false;
  return Boolean(provider.models?.[0]?.id);
}

function resolveImportModel(bootstrap, settings) {
  const providers = Array.isArray(bootstrap?.providers) ? bootstrap.providers : [];
  const selectedIds = Array.isArray(bootstrap?.user?.providers?.selected)
    ? bootstrap.user.providers.selected
    : [];
  const details = bootstrap?.user?.providers?.details ?? {};
  const byId = new Map(providers.map((provider) => [provider.id, provider]));

  if (settings?.defaultModel?.providerId && settings?.defaultModel?.modelId) {
    const provider = byId.get(settings.defaultModel.providerId);
    const model = provider?.models?.find((entry) => entry.id === settings.defaultModel.modelId);
    if (provider && model && providerIsConfigured(provider, details[provider.id])) {
      return settings.defaultModel;
    }
  }

  const ordered = [
    ...selectedIds.map((id) => byId.get(id)).filter(Boolean),
    ...providers.filter((provider) => !selectedIds.includes(provider.id)),
  ];
  const provider = ordered.find((entry) => providerIsConfigured(entry, details[entry.id]));

  return provider?.models?.[0]?.id
    ? { providerId: provider.id, modelId: provider.models[0].id }
    : null;
}

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
  let importOverlay = null;

  async function populateList(query = '') {
    if (!listEl) return;
    const savedScroll = listEl.scrollTop;
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
    const withData = memories.filter((memory) => (memory.lineCount ?? 0) > 0);
    const filtered = normalizedQuery
      ? withData.filter((memory) => {
          const haystack = [memory.filename, memory.title, memory.description]
            .map((value) => collapseWhitespace(value).toLowerCase())
            .join('\n');
          return haystack.includes(normalizedQuery);
        })
      : withData;

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
    listEl.scrollTop = savedScroll;
  }

  function buildMemoryCard(memory) {
    const card = createElement(
      'button',
      `chat-memory__card${activeFilename === memory.filename ? ' chat-memory__card--active' : ''}`,
    );
    card.type = 'button';
    card.dataset.filename = memory.filename;
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

    listEl?.querySelectorAll('.chat-memory__card').forEach((card) => {
      card.classList.toggle('chat-memory__card--active', card.dataset.filename === activeFilename);
    });
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

  function closeImportDialog() {
    importOverlay?.remove();
    importOverlay = null;
  }

  async function runMemoryImport(textarea, statusEl, saveBtn, cancelBtn) {
    const importedText = String(textarea.value ?? '').trim();
    if (!importedText) {
      statusEl.textContent = strings.importMemory.emptyInput;
      statusEl.className = 'chat-memory-import__status chat-memory-import__status--error';
      return;
    }

    textarea.disabled = true;
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    statusEl.textContent = strings.importMemory.analysing;
    statusEl.className = 'chat-memory-import__status';

    try {
      const [catalog, bootstrap, appSettings] = await Promise.all([
        invokeIpc('memory:get-catalog'),
        invokeIpc('chat:bootstrap'),
        invokeIpc('app-settings:get').catch(() => ({})),
      ]);
      const catalogBlock = buildImportCatalogBlock(catalog, strings.importMemory.emptyCatalog);
      const selectedModel = resolveImportModel(bootstrap, appSettings);
      const prompt = strings.importMemory.userPrompt
        .replace('{catalog}', () => catalogBlock)
        .replace('{importedText}', () => importedText);
      const result = await invokeIpc('chat:complete-message', {
        messages: [{ role: 'user', content: prompt }],
        providerId: selectedModel?.providerId ?? null,
        modelId: selectedModel?.modelId ?? null,
        modeInstruction: strings.importMemory.systemInstruction,
        isNewSession: false,
      });
      const jsonText = extractJsonObject(result?.text);
      if (!jsonText) throw new Error(strings.importMemory.parseFailed);

      const payload = normalizeImportPayload(JSON.parse(jsonText));
      if (!payload.updates.length && !payload.newFiles.length) {
        throw new Error(strings.importMemory.noUpdates);
      }

      await invokeIpc('memory:apply-updates', payload);
      statusEl.textContent = strings.importMemory.done;
      statusEl.className = 'chat-memory-import__status chat-memory-import__status--success';
      await populateList(search?.getValue().trim() ?? '');
      setTimeout(closeImportDialog, 900);
    } catch (error) {
      statusEl.textContent = error?.message || strings.importMemory.failed;
      statusEl.className = 'chat-memory-import__status chat-memory-import__status--error';
      textarea.disabled = false;
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  }

  function openImportDialog() {
    if (!panel || importOverlay) return;

    importOverlay = createElement('div', 'chat-memory-import');
    const dialog = createElement('section', 'chat-memory-import__dialog');
    const header = createElement('div', 'chat-memory-import__header');
    const copy = createElement('div', 'chat-memory-import__copy');
    copy.append(
      createElement('h3', 'chat-memory-import__title', strings.importMemory.title),
      createElement('p', 'chat-memory-import__subtitle', strings.importMemory.subtitle),
    );
    const closeBtn = createElement('button', 'chat-memory-import__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', strings.importMemory.close);
    closeBtn.append(createIcon('close', 'chat-memory-import__close-icon'));
    closeBtn.addEventListener('click', closeImportDialog);
    header.append(copy, closeBtn);

    const textarea = createElement('textarea', 'chat-memory-import__textarea');
    textarea.placeholder = strings.importMemory.placeholder;
    textarea.setAttribute('aria-label', strings.importMemory.textareaLabel);

    const statusEl = createElement('p', 'chat-memory-import__status');
    const actions = createElement('div', 'chat-memory-import__actions');
    const cancelBtn = createElement(
      'button',
      'chat-memory-import__button',
      strings.importMemory.cancel,
    );
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', closeImportDialog);
    const saveBtn = createElement(
      'button',
      'chat-memory-import__button chat-memory-import__button--primary',
      strings.importMemory.save,
    );
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => {
      void runMemoryImport(textarea, statusEl, saveBtn, cancelBtn);
    });
    actions.append(cancelBtn, saveBtn);

    dialog.append(header, textarea, statusEl, actions);
    importOverlay.append(dialog);
    importOverlay.addEventListener('click', (event) => {
      if (event.target === importOverlay) closeImportDialog();
    });
    panel.append(importOverlay);
    textarea.focus();
  }

  function build() {
    if (panel) return panel;

    panel = createElement('div', 'chat-memory');
    panel.hidden = true;

    const importButton = createElement('button', 'chat-memory__import');
    importButton.type = 'button';
    importButton.append(
      createIcon('download', 'chat-memory__import-icon'),
      createElement('span', 'chat-memory__import-label', strings.importMemory.action),
    );
    importButton.addEventListener('click', openImportDialog);

    panel.append(
      createPanelHeader({
        title: strings.title,
        subtitle: strings.subtitle,
        actions: [importButton],
      }),
    );

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
