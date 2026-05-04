import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';

// ---------------------------------------------------------------------------
// Icons — only the subset needed by the Templates panel.
// ---------------------------------------------------------------------------

const iconMarkup = {
  pencil: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  `,
  trash: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  `
};

function createIcon(name, className = '') {
  const icon = createElement('span', className || 'chat-icon');
  icon.innerHTML = iconMarkup[name] ?? '';
  return icon;
}

function createTemplateId(name) {
  const sanitized = (name || 'Template').trim()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'Template';
  const unique = Math.random().toString(36).slice(2, 7).padEnd(5, '0');
  return `${sanitized}-${unique}`;
}

// ---------------------------------------------------------------------------
// createTemplatesPanel
//
// Factory that builds and manages the Templates sidebar panel.
// Accepts the `templates` i18n namespace so the caller controls locale.
//
// Returns:
//   build()        — builds and returns the panel HTMLElement (call once)
//   populateList() — re-fetches and renders the template cards
// ---------------------------------------------------------------------------

export function createTemplatesPanel(strings) {
  // Panel-scoped draft state
  let draftTemplateCommand    = '';
  let draftTemplateName       = '';
  let draftTemplatePrompt     = '';
  let editingTemplateId       = null;
  let editingTemplateCreatedAt = null;

  // Reference to the built panel element — set after build() is called.
  let panelRef = null;

  // ── populateList ──────────────────────────────────────────────────────────

  async function populateList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'chat-templates__skeleton'));
    }

    let templates;
    try {
      templates = await window.JoaniumChat.listTemplates();
    } catch {
      templates = [];
    }

    const normalizedQuery = collapseWhitespace(query).toLowerCase();
    const filtered = normalizedQuery
      ? templates.filter((t) => {
          const haystack = [t.name, t.command, t.prompt]
            .map((v) => collapseWhitespace(v).toLowerCase())
            .join('\n');
          return haystack.includes(normalizedQuery);
        })
      : templates;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-templates__empty');
      empty.append(
        createElement('p', 'chat-templates__empty-title',
          normalizedQuery ? strings.noResults : strings.empty),
        createElement('p', 'chat-templates__empty-hint',
          normalizedQuery ? strings.noResultsHint : strings.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const template of filtered) {
      listEl.append(buildCard(template, listEl));
    }
  }

  // ── buildCard ─────────────────────────────────────────────────────────────

  function buildCard(template, listEl) {
    const card = createElement('div', 'chat-templates__card');

    const commandBadge = createElement('div', 'chat-templates__card-command', template.command);

    const body     = createElement('div', 'chat-templates__card-body');
    const nameEl   = createElement('div', 'chat-templates__card-name', template.name);
    const promptEl = createElement('div', 'chat-templates__card-prompt', template.prompt);
    body.append(nameEl, promptEl);

    const actions  = createElement('div', 'chat-templates__card-actions');

    const editBtn = createElement('button', 'chat-templates__card-btn');
    editBtn.type  = 'button';
    editBtn.setAttribute('aria-label', strings.edit);
    editBtn.append(createIcon('pencil', 'chat-templates__card-btn-icon'));
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const full = await window.JoaniumChat.loadTemplate(template.id);
        panelRef?._startEdit(full);
      } catch (error) {
        console.error('[Joanium] Failed to load template for editing:', error);
      }
    });

    const deleteBtn = createElement('button', 'chat-templates__card-btn chat-templates__card-btn--danger');
    deleteBtn.type  = 'button';
    deleteBtn.setAttribute('aria-label', strings.delete);
    deleteBtn.append(createIcon('trash', 'chat-templates__card-btn-icon'));
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteTemplate(template.id);
      } catch (error) {
        console.error('[Joanium] Failed to delete template:', error);
      }
      if (editingTemplateId === template.id) panelRef?._resetForm();
      await populateList(listEl, panelRef?._search.getValue().trim() ?? '');
    });

    actions.append(editBtn, deleteBtn);
    card.append(commandBadge, body, actions);
    return card;
  }

  // ── build ─────────────────────────────────────────────────────────────────

  function build() {
    const panel = createElement('div', 'chat-templates');
    panel.hidden = true;

    // Header
    const header = createElement('div', 'chat-templates__header');
    const headerCopy = createElement('div', 'chat-templates__header-copy');
    headerCopy.append(
      createElement('h2', 'chat-templates__title', strings.title),
      createElement('p', 'chat-templates__subtitle', strings.subtitle)
    );
    header.append(headerCopy);
    panel.append(header);

    // Body
    const body = createElement('div', 'chat-templates__body');

    // ── Left: form ────────────────────────────────────────────────────────
    const formCol = createElement('div', 'chat-templates__form-col');
    const formHeading = createElement('p', 'chat-templates__form-heading', strings.newTemplateHeading);
    formCol.append(formHeading);

    const formCard = createElement('div', 'chat-templates__form-card');

    const commandLabel = createElement('label', 'chat-templates__field-label', strings.commandLabel);
    const commandInput = document.createElement('input');
    commandInput.type        = 'text';
    commandInput.className   = 'chat-templates__command-input';
    commandInput.placeholder = strings.commandPlaceholder;
    commandInput.style.webkitUserSelect = 'text';
    commandInput.style.userSelect       = 'text';
    commandInput.style.cursor           = 'text';
    commandInput.addEventListener('input', (e) => {
      draftTemplateCommand = e.target.value;
      syncTemplateSaveBtn();
    });
    const commandHint = createElement('span', 'chat-templates__field-hint', strings.commandHint);

    const nameLabel = createElement('label', 'chat-templates__field-label', strings.nameLabel);
    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.className   = 'chat-templates__name-input';
    nameInput.placeholder = strings.namePlaceholder;
    nameInput.style.webkitUserSelect = 'text';
    nameInput.style.userSelect       = 'text';
    nameInput.style.cursor           = 'text';
    nameInput.addEventListener('input', (e) => {
      draftTemplateName = e.target.value;
      syncTemplateSaveBtn();
    });

    const promptLabel = createElement('label', 'chat-templates__field-label', strings.promptLabel);
    const promptTextarea = document.createElement('textarea');
    promptTextarea.className   = 'chat-templates__prompt-textarea';
    promptTextarea.placeholder = strings.promptPlaceholder;
    promptTextarea.rows        = 6;
    promptTextarea.style.webkitUserSelect = 'text';
    promptTextarea.style.userSelect       = 'text';
    promptTextarea.style.cursor           = 'text';
    promptTextarea.addEventListener('input', (e) => {
      draftTemplatePrompt = e.target.value;
      syncTemplateSaveBtn();
    });

    const formActions = createElement('div', 'chat-templates__form-actions');

    const cancelBtn = createElement('button', 'chat-templates__btn-cancel');
    cancelBtn.type = 'button';
    cancelBtn.textContent = strings.cancel;

    const saveBtn = createElement('button', 'chat-templates__btn-save');
    saveBtn.type = 'button';
    saveBtn.disabled = true;
    saveBtn.textContent = strings.save;

    function syncTemplateSaveBtn() {
      saveBtn.disabled = !draftTemplateCommand.trim() || !draftTemplateName.trim() || !draftTemplatePrompt.trim();
    }

    function syncTemplateFormChrome() {
      formHeading.textContent = editingTemplateId
        ? strings.editTemplateHeading
        : strings.newTemplateHeading;
      saveBtn.textContent = editingTemplateId
        ? strings.update
        : strings.save;
    }

    function resetTemplateForm() {
      editingTemplateId        = null;
      editingTemplateCreatedAt = null;
      draftTemplateCommand     = '';
      draftTemplateName        = '';
      draftTemplatePrompt      = '';
      commandInput.value       = '';
      nameInput.value          = '';
      promptTextarea.value     = '';
      syncTemplateFormChrome();
      syncTemplateSaveBtn();
    }

    function applyTemplateToForm(template) {
      editingTemplateId        = template.id;
      editingTemplateCreatedAt = template.createdAt ?? null;
      draftTemplateCommand     = template.command ?? '';
      draftTemplateName        = template.name ?? '';
      draftTemplatePrompt      = template.prompt ?? '';
      commandInput.value       = draftTemplateCommand;
      nameInput.value          = draftTemplateName;
      promptTextarea.value     = draftTemplatePrompt;
      syncTemplateFormChrome();
      syncTemplateSaveBtn();
      commandInput.focus();
      commandInput.select();
    }

    saveBtn.addEventListener('click', async () => {
      const command = draftTemplateCommand.trim();
      const name    = draftTemplateName.trim();
      const prompt  = draftTemplatePrompt.trim();
      if (!command || !name || !prompt) return;

      const now = new Date().toISOString();
      const template = {
        id:        editingTemplateId ?? createTemplateId(name),
        name,
        command,
        prompt,
        createdAt: editingTemplateCreatedAt ?? now,
        updatedAt: now
      };

      try {
        await window.JoaniumChat.saveTemplate(template);
      } catch (err) {
        console.error('[Joanium] Failed to save template:', err);
        return;
      }

      resetTemplateForm();
      await populateList(panel._listEl, panel._search.getValue().trim());
    });

    cancelBtn.addEventListener('click', resetTemplateForm);

    formActions.append(cancelBtn, saveBtn);
    formCard.append(
      commandLabel, commandInput, commandHint,
      nameLabel, nameInput,
      promptLabel, promptTextarea,
      formActions
    );
    formCol.append(formCard);

    // ── Right: list ───────────────────────────────────────────────────────
    const listCol = createElement('div', 'chat-templates__list-col');
    listCol.append(createElement('p', 'chat-templates__list-heading', strings.yourTemplates));

    const searchWrap = createElement('div', 'chat-templates__list-search');
    const search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(listContent, value.trim())
    });
    search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(search.element);

    const listContent = createElement('div', 'chat-templates__list-content');
    listCol.append(searchWrap, listContent);

    body.append(formCol, listCol);
    panel.append(body);

    panel._listEl    = listContent;
    panel._search    = search;
    panel._startEdit = applyTemplateToForm;
    panel._resetForm = resetTemplateForm;
    syncTemplateFormChrome();

    panelRef = panel;
    return panel;
  }

  return { build, populateList };
}
