import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createInputBoxLite } from '../../Shared/InputBoxLite/InputBoxLite.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';

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
      templates = await invokeIpc('templates:list-templates');
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
        const full = await invokeIpc('templates:load-template', template.id);
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
        await invokeIpc('templates:delete-template', template.id);
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
    const header = createPanelHeader({ title: strings.title, subtitle: strings.subtitle });
    panel.append(header);

    // Body
    const body = createElement('div', 'chat-templates__body');

    // ── Left: form ────────────────────────────────────────────────────────
    const formCol = createElement('div', 'chat-templates__form-col');
    const formHeading = createElement('p', 'chat-templates__form-heading', strings.newTemplateHeading);
    formCol.append(formHeading);

    const formCard = createElement('div', 'chat-templates__form-card');

    const commandBox = createInputBoxLite({
      label: strings.commandLabel,
      labelClassName: 'chat-templates__field-label',
      className: 'chat-templates__command-input',
      placeholder: strings.commandPlaceholder,
      description: strings.commandHint,
      descriptionClassName: 'chat-templates__field-hint',
      onInput: (value) => {
        draftTemplateCommand = value;
        syncTemplateSaveBtn();
      }
    });

    const nameBox = createInputBoxLite({
      label: strings.nameLabel,
      labelClassName: 'chat-templates__field-label',
      className: 'chat-templates__name-input',
      placeholder: strings.namePlaceholder,
      onInput: (value) => {
        draftTemplateName = value;
        syncTemplateSaveBtn();
      }
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
      commandBox.input.value   = '';
      nameBox.input.value      = '';
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
      commandBox.input.value   = draftTemplateCommand;
      nameBox.input.value      = draftTemplateName;
      promptTextarea.value     = draftTemplatePrompt;
      syncTemplateFormChrome();
      syncTemplateSaveBtn();
      commandBox.input.focus();
      commandBox.input.select();
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
        await invokeIpc('templates:save-template', template);
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
      commandBox.element,
      nameBox.element,
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
