import { copyToClipboard, createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';
import { MEMORY_PROMPTS } from './Prompts.js';

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

// All files listed with just filename + description so the AI knows every available bucket.
function buildFileRegistry(catalog = []) {
  if (!Array.isArray(catalog) || catalog.length === 0) return '(none)';
  return catalog.map((entry) => `- ${entry.filename}: ${entry.description}`).join('\n');
}

// Only non-empty files, capped per file so the prompt stays fast.
const EXISTING_CONTENT_PER_FILE_LIMIT = 600;

function buildExistingContentBlock(catalog = [], emptyLabel) {
  if (!Array.isArray(catalog) || catalog.length === 0) return emptyLabel;
  const populated = catalog.filter((entry) => !entry.empty);
  if (populated.length === 0) return emptyLabel;
  return populated
    .map((entry) => {
      let content = String(entry.content ?? '').trim() || emptyLabel;
      if (content.length > EXISTING_CONTENT_PER_FILE_LIMIT) {
        content = content.slice(0, EXISTING_CONTENT_PER_FILE_LIMIT) + '\n[…truncated]';
      }
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
  let importLoader = null;

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
      'div',
      `chat-memory__card${activeFilename === memory.filename ? ' chat-memory__card--active' : ''}`,
    );
    card.__memoryFilename = memory.filename;

    const cardBody = createElement('button', 'chat-memory__card-body');
    cardBody.type = 'button';
    cardBody.append(
      createElement('span', 'chat-memory__card-title', memory.title),
      createElement(
        'span',
        'chat-memory__card-meta',
        formatText(strings.stats, {
          lines: String(memory.lineCount ?? 0),
        }),
      ),
    );
    cardBody.addEventListener('click', () => {
      void loadMemory(memory.filename);
    });

    const deleteBtn = createElement(
      'button',
      'chat-memory__card-btn chat-memory__card-btn--danger',
    );
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', strings.delete);
    deleteBtn.append(createIcon('trash', 'chat-memory__card-btn-icon'));
    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      deleteBtn.disabled = true;
      try {
        await invokeIpc('memory:delete', memory.filename);
        if (activeFilename === memory.filename) renderEmptyEditor();
        await populateList(search?.getValue().trim() ?? '');
      } catch {
        deleteBtn.disabled = false;
      }
    });

    const cardActions = createElement('div', 'chat-memory__card-actions');
    cardActions.append(deleteBtn);
    card.append(cardBody, cardActions);
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
      card.classList.toggle('chat-memory__card--active', card.__memoryFilename === activeFilename);
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

  function showImportLoader() {
    if (!importLoader) return;
    importLoader.hidden = false;
    importLoader.classList.remove('chat-memory__import-loader--leaving');
  }

  function hideImportLoader(afterHide) {
    if (!importLoader || importLoader.hidden) {
      afterHide?.();
      return;
    }

    importLoader.classList.add('chat-memory__import-loader--leaving');
    setTimeout(() => {
      if (importLoader) {
        importLoader.hidden = true;
        importLoader.classList.remove('chat-memory__import-loader--leaving');
      }
      afterHide?.();
    }, 180);
  }

  async function handleCopyPrompt() {
    if (!copyPromptBtn || !copyPromptLabelEl) return;
    copyPromptBtn.disabled = true;

    try {
      const promptText = await invokeIpc('memory:get-export-prompt');
      await copyToClipboard(promptText);
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
    importStatusEl.textContent = '';
    importStatusEl.className = 'chat-memory__import-status';
    showImportLoader();

    let selectedModel = null;

    try {
      const [catalog, bootstrap, appSettings, triagePromptTemplate, importPromptTemplate] =
        await Promise.all([
          invokeIpc('memory:get-catalog'),
          invokeIpc('chat:bootstrap'),
          invokeIpc('app-settings:get').catch(() => ({})),
          invokeIpc('memory:get-triage-prompt'),
          invokeIpc('memory:get-import-prompt'),
        ]);

      selectedModel = resolveImportModel(bootstrap, appSettings);

      // ── Phase 1: triage ───────────────────────────────────────────────────
      // Tiny call: file registry (names + descriptions only, no content) +
      // import text. Returns just the filenames that need updating.
      const triagePrompt = triagePromptTemplate
        .replace('{fileRegistry}', () => buildFileRegistry(catalog))
        .replace('{importedText}', () => importedText);

      const triageResult = await invokeIpc('chat:complete-message', {
        messages: [{ role: 'user', content: triagePrompt }],
        providerId: selectedModel?.providerId ?? null,
        modelId: selectedModel?.modelId ?? null,
        maxTokens: 256,
        isNewSession: false,
      });

      // Parse the filename array; fall back to full catalog so no data is lost.
      let targetCatalog;
      try {
        const raw = String(triageResult?.text ?? '').trim();
        const start = raw.indexOf('[');
        const end = raw.lastIndexOf(']');
        const filenames = JSON.parse(raw.slice(start, end + 1));
        if (!Array.isArray(filenames) || filenames.length === 0) throw new Error();
        const targetSet = new Set(filenames.map((name) => String(name).trim()));
        targetCatalog = catalog.filter((entry) => targetSet.has(entry.filename));
        if (targetCatalog.length === 0) throw new Error();
      } catch {
        targetCatalog = catalog;
      }

      // ── Phase 2: merge ────────────────────────────────────────────────────
      // Focused call: only the relevant files with their existing content.
      const mergePrompt = importPromptTemplate
        .replace('{fileRegistry}', () => buildFileRegistry(targetCatalog))
        .replace('{existingContent}', () =>
          buildExistingContentBlock(targetCatalog, strings.importMemory.emptyCatalog),
        )
        .replace('{importedText}', () => importedText);

      const result = await invokeIpc('chat:complete-message', {
        messages: [{ role: 'user', content: mergePrompt }],
        providerId: selectedModel?.providerId ?? null,
        modelId: selectedModel?.modelId ?? null,
        modeInstruction: MEMORY_PROMPTS.importSystemInstruction,
        maxTokens: 2048,
        isNewSession: false,
      });

      const jsonText = extractJsonObject(result?.text);
      if (!jsonText) throw new Error(strings.importMemory.parseFailed);

      const payload = normalizeImportPayload(JSON.parse(jsonText));
      if (!payload.updates.length && !payload.newFiles.length) {
        throw new Error(strings.importMemory.noUpdates);
      }

      await invokeIpc('memory:apply-updates', payload);
      await populateList(search?.getValue().trim() ?? '');

      hideImportLoader(() => {
        importStatusEl.textContent = strings.importMemory.done;
        importStatusEl.className = 'chat-memory__import-status chat-memory__import-status--success';
        setTimeout(showEditorView, 900);
      });
    } catch (error) {
      const msg = String(error?.message ?? '');
      const isServerError =
        (typeof error?.statusCode === 'number' && error.statusCode >= 500) ||
        /\b5\d{2}\b/.test(msg) ||
        /gateway.?timeout|service.?unavailable|bad.?gateway|timed?.out/i.test(msg);
      const displayName = selectedModel?.modelId ?? 'the selected model';
      const errorText = isServerError
        ? formatText(strings.importMemory.modelContextLimit, { modelName: displayName })
        : error?.message || strings.importMemory.failed;

      hideImportLoader(() => {
        importStatusEl.textContent = errorText;
        importStatusEl.className = 'chat-memory__import-status chat-memory__import-status--error';
        importTextarea.disabled = false;
        importSaveBtn.disabled = false;
        importCancelBtn.disabled = false;
      });
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

    // ── Copy prompt button + Cancel grouped together in the header ────────
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

    importCancelBtn = createElement('button', 'chat-memory__import-back');
    importCancelBtn.type = 'button';
    importCancelBtn.textContent = strings.importMemory.cancel;
    importCancelBtn.addEventListener('click', showEditorView);

    const importHeaderActions = createElement('div', 'chat-memory__import-header-actions');
    importHeaderActions.append(copyPromptBtn, importCancelBtn);
    importHeader.append(importCopy, importHeaderActions);

    // ── Paste label ──────────────────────────────────────────────────────
    const pasteLabel = createElement(
      'span',
      'chat-memory__step-label',
      strings.importMemory.getPrompt.pasteLabel,
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

    // ── Import loader overlay ────────────────────────────────────────────────
    importLoader = createElement('div', 'chat-memory__import-loader');
    importLoader.hidden = true;
    const loaderInner = createElement(
      'div',
      'logo-loader logo-loader--infinite logo-loader--inline',
    );
    const loaderGlow = createElement('div', 'logo-loader__glow');
    const loaderWrap = createElement('div', 'logo-loader__wrap');
    const loaderImg = document.createElement('img');
    loaderImg.className = 'logo-loader__img';
    loaderImg.src = '../../../Assets/Logo/Logo.png';
    loaderImg.alt = '';
    loaderImg.style.width = '80px';
    loaderImg.style.height = '80px';
    loaderWrap.append(loaderImg);
    loaderInner.append(loaderGlow, loaderWrap);
    importLoader.append(loaderInner);

    importView.append(
      importHeader,
      pasteLabel,
      importTextarea,
      importStatusEl,
      importActions,
      importLoader,
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
