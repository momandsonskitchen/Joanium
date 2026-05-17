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
  let editorView = null;
  let importView = null;
  let importTextarea = null;
  let importStatusEl = null;
  let importSaveBtn = null;
  let importCancelBtn = null;
  let copyPromptBtn = null;
  let copyPromptLabelEl = null;
  let copyPromptResetTimer = null;

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

  function showEditorView() {
    if (importView) importView.hidden = true;
    if (editorView) editorView.hidden = false;
  }

  function resetCopyPromptButton() {
    if (copyPromptLabelEl)
      copyPromptLabelEl.textContent = strings.importMemory.getPrompt.copyPrompt;
    if (copyPromptBtn) {
      copyPromptBtn.disabled = false;
      copyPromptBtn.classList.remove('chat-memory__copy-prompt--copied');
    }
  }

  function showImportView() {
    if (!editorView || !importView) return;
    editorView.hidden = true;
    importView.hidden = false;
    if (importTextarea) {
      importTextarea.value = '';
      importTextarea.disabled = false;
      importTextarea.focus();
    }
    if (importStatusEl) {
      importStatusEl.textContent = '';
      importStatusEl.className = 'chat-memory__import-status';
    }
    if (importSaveBtn) importSaveBtn.disabled = false;
    if (importCancelBtn) importCancelBtn.disabled = false;
    clearTimeout(copyPromptResetTimer);
    resetCopyPromptButton();
  }

  async function handleCopyPrompt() {
    if (!copyPromptBtn || !copyPromptLabelEl) return;
    copyPromptBtn.disabled = true;

    try {
      const promptText = await invokeIpc('memory:get-export-prompt');
      await navigator.clipboard.writeText(promptText);
      copyPromptLabelEl.textContent = strings.importMemory.getPrompt.copied;
      copyPromptBtn.classList.add('chat-memory__copy-prompt--copied');
      copyPromptResetTimer = setTimeout(resetCopyPromptButton, 2000);
    } catch {
      copyPromptLabelEl.textContent = strings.importMemory.getPrompt.copyFailed;
      copyPromptResetTimer = setTimeout(resetCopyPromptButton, 1800);
    }
  }

  async function runMemoryImport() {
    const importedText = String(importTextarea.value ?? '').trim();
    if (!importedText) {
      importStatusEl.textContent = strings.importMemory.emptyInput;
      importStatusEl.className = 'chat-memory__import-status chat-memory__import-status--error';
      return;
    }

    importTextarea.disabled = true;
    importSaveBtn.disabled = true;
    importCancelBtn.disabled = true;
    importStatusEl.textContent = strings.importMemory.analysing;
    importStatusEl.className = 'chat-memory__import-status';

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
      importStatusEl.textContent = strings.importMemory.done;
      importStatusEl.className = 'chat-memory__import-status chat-memory__import-status--success';
      await populateList(search?.getValue().trim() ?? '');
      setTimeout(showEditorView, 900);
    } catch (error) {
      importStatusEl.textContent = error?.message || strings.importMemory.failed;
      importStatusEl.className = 'chat-memory__import-status chat-memory__import-status--error';
      importTextarea.disabled = false;
      importSaveBtn.disabled = false;
      importCancelBtn.disabled = false;
    }
  }

  function build() {
    if (panel) return panel;

    panel = createElement('div', 'chat-memory');
    panel.hidden = true;

    panel.append(
      createPanelHeader({
        title: strings.title,
        subtitle: strings.subtitle,
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

    const importButton = createElement('button', 'chat-memory__import');
    importButton.type = 'button';
    importButton.append(createIcon('download', 'chat-memory__import-icon'));
    importButton.addEventListener('click', showImportView);

    searchWrap.append(search.element, importButton);
    listEl = createElement('div', 'chat-memory__list');
    listColumn.append(searchWrap, listEl);

    // ── Editor view ──────────────────────────────────────────────────────
    editorView = createElement('div', 'chat-memory__editor-view');

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

    editorView.append(editorHeader, editor);

    // ── Import view ──────────────────────────────────────────────────────
    importView = createElement('div', 'chat-memory__import-view');
    importView.hidden = true;

    const importHeader = createElement('div', 'chat-memory__import-header');
    const importCopy = createElement('div', 'chat-memory__import-copy');
    importCopy.append(
      createElement('h3', 'chat-memory__import-title', strings.importMemory.title),
      createElement('p', 'chat-memory__import-subtitle', strings.importMemory.subtitle),
    );
    importCancelBtn = createElement('button', 'chat-memory__import-back');
    importCancelBtn.type = 'button';
    importCancelBtn.append(
      createIcon('arrow-left', 'chat-memory__import-back-icon'),
      createElement('span', '', strings.importMemory.cancel),
    );
    importCancelBtn.addEventListener('click', showEditorView);
    importHeader.append(importCopy, importCancelBtn);

    // ── Step 1 — Copy prompt ─────────────────────────────────────────────
    const stepOneBlock = createElement('div', 'chat-memory__step-block');

    const stepOneTop = createElement('div', 'chat-memory__step-top');
    stepOneTop.append(
      createElement('span', 'chat-memory__step-label', strings.importMemory.getPrompt.stepOneLabel),
    );

    copyPromptBtn = createElement('button', 'chat-memory__copy-prompt');
    copyPromptBtn.type = 'button';
    copyPromptLabelEl = createElement(
      'span',
      'chat-memory__copy-prompt-label',
      strings.importMemory.getPrompt.copyPrompt,
    );
    copyPromptBtn.append(createIcon('copy', 'chat-memory__copy-prompt-icon'), copyPromptLabelEl);
    copyPromptBtn.addEventListener('click', () => {
      void handleCopyPrompt();
    });

    stepOneTop.append(copyPromptBtn);
    stepOneBlock.append(
      stepOneTop,
      createElement('p', 'chat-memory__step-hint', strings.importMemory.getPrompt.stepOneHint),
    );

    // ── Step 2 — Paste output ────────────────────────────────────────────
    const stepTwoLabel = createElement(
      'span',
      'chat-memory__step-label',
      strings.importMemory.getPrompt.stepTwoLabel,
    );

    importTextarea = createElement('textarea', 'chat-memory__import-textarea');
    importTextarea.placeholder = strings.importMemory.placeholder;
    importTextarea.setAttribute('aria-label', strings.importMemory.textareaLabel);

    importStatusEl = createElement('p', 'chat-memory__import-status');

    const importActions = createElement('div', 'chat-memory__import-actions');
    importSaveBtn = createElement(
      'button',
      'chat-memory__import-btn chat-memory__import-btn--primary',
      strings.importMemory.save,
    );
    importSaveBtn.type = 'button';
    importSaveBtn.addEventListener('click', () => {
      void runMemoryImport();
    });
    importActions.append(importSaveBtn);

    importView.append(
      importHeader,
      stepOneBlock,
      stepTwoLabel,
      importTextarea,
      importStatusEl,
      importActions,
    );

    editorColumn.append(editorView, importView);
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
