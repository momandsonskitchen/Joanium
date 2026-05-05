import { formatText, createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';


function createProjectId(name) {
  const sanitized = (name || 'Project').trim()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'Project';
  const unique = Math.random().toString(36).slice(2, 7).padEnd(5, '0');
  return `${sanitized}-${unique}`;
}

function getProjectCoverUrl(coverImagePath) {
  const normalizedPath = collapseWhitespace(coverImagePath);
  if (!normalizedPath) return '';
  if (normalizedPath.startsWith('file://')) return normalizedPath;

  const slashPath = normalizedPath.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(slashPath)) {
    return encodeURI(`file:///${slashPath}`);
  }

  return encodeURI(`file://${slashPath}`);
}

// ---------------------------------------------------------------------------
// createProjectsPanel
//
// Factory that builds and manages the Projects sidebar panel.
// Follows the same contract as createTemplatesPanel.
//
// Parameters:
//   strings          — the projects i18n namespace
//   onOpenProject    — callback(fullProject) fired when the user clicks "Open"
//   getActiveProject — getter () => { id, name, ... } | null
//
// Returns:
//   build()        — builds and returns the panel HTMLElement (call once)
//   populateList() — re-fetches and renders the project cards
// ---------------------------------------------------------------------------

export function createProjectsPanel(strings, { onOpenProject, getActiveProject }) {
  // Panel-scoped draft state
  let draftName           = '';
  let draftIcon           = '📁';
  let draftInfo           = '';
  let draftCoverImagePath = '';
  let draftFolderPath     = '';
  let editingProjectId        = null;
  let editingProjectCreatedAt = null;

  // Reference to the built panel element — set after build() is called.
  let panelRef = null;

  // ── populateList ──────────────────────────────────────────────────────────

  async function populateList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'chat-projects__skeleton'));
    }

    let projects;
    try {
      projects = await window.JoaniumChat.listProjects();
    } catch {
      projects = [];
    }

    const normalizedQuery = collapseWhitespace(query).toLowerCase();
    const filteredProjects = normalizedQuery
      ? projects.filter((project) => {
          const haystack = [project.name, project.info]
            .map((value) => collapseWhitespace(value).toLowerCase())
            .join('\n');
          return haystack.includes(normalizedQuery);
        })
      : projects;

    listEl.replaceChildren();

    if (filteredProjects.length === 0) {
      const empty = createElement('div', 'chat-projects__empty');
      empty.append(
        createElement('p', 'chat-projects__empty-title',
          normalizedQuery ? strings.noResults : strings.empty),
        createElement('p', 'chat-projects__empty-hint',
          normalizedQuery ? strings.noResultsHint : strings.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const project of filteredProjects) {
      listEl.append(buildCard(project, listEl));
    }
  }

  // ── buildCard ─────────────────────────────────────────────────────────────

  function buildCard(project, listEl) {
    const activeProject = getActiveProject();
    const isActiveProject = activeProject?.id === project.id;
    const card = createElement(
      'div',
      `chat-projects__card${isActiveProject ? ' chat-projects__card--active' : ''}`
    );

    const coverUrl = getProjectCoverUrl(project.coverImagePath);
    const iconEl = createElement(
      'div',
      `chat-projects__card-icon${coverUrl ? ' chat-projects__card-icon--image' : ''}`,
      coverUrl ? '' : (project.icon || '📁')
    );

    if (coverUrl) {
      const coverImage = document.createElement('img');
      coverImage.className = 'chat-projects__card-cover-img';
      coverImage.src = coverUrl;
      coverImage.alt = '';
      iconEl.append(coverImage);
    }

    const body   = createElement('div', 'chat-projects__card-body');
    const nameEl = createElement('div', 'chat-projects__card-name', project.name);
    const dateStr = new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const metaWrap = createElement('div', 'chat-projects__card-meta-wrap');
    metaWrap.append(
      createElement('div', 'chat-projects__card-meta', formatText(strings.created, { date: dateStr }))
    );

    body.append(nameEl, metaWrap);

    async function openProject() {
      let fullProject;
      try {
        fullProject = await window.JoaniumChat.loadProject(project.id);
      } catch (error) {
        console.error('[Joanium] Failed to load project:', error);
        return;
      }
      onOpenProject(fullProject);
    }

    const openBtn = createElement(
      'button',
      `chat-projects__open-btn${isActiveProject ? ' chat-projects__open-btn--active' : ''}`
    );
    openBtn.type = 'button';
    openBtn.textContent = isActiveProject ? strings.active : strings.open;
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      void openProject();
    });

    const actions = createElement('div', 'chat-projects__card-actions');

    const editBtn = createElement('button', 'chat-projects__card-btn');
    editBtn.type = 'button';
    editBtn.setAttribute('aria-label', strings.edit);
    editBtn.append(createIcon('pencil', 'chat-projects__card-btn-icon'));
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const fullProject = await window.JoaniumChat.loadProject(project.id);
        panelRef?._startEdit(fullProject);
      } catch (error) {
        console.error('[Joanium] Failed to load project for editing:', error);
      }
    });

    const deleteBtn = createElement('button', 'chat-projects__card-btn chat-projects__card-btn--danger');
    deleteBtn.type  = 'button';
    deleteBtn.setAttribute('aria-label', strings.delete);
    deleteBtn.append(createIcon('trash', 'chat-projects__card-btn-icon'));
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteProject(project.id);
      } catch (error) {
        console.error('[Joanium] Failed to delete project:', error);
      }

      const currentActive = getActiveProject();
      if (currentActive?.id === project.id) {
        onOpenProject(null); // clear active project
      }

      if (editingProjectId === project.id) {
        panelRef?._resetForm();
      }

      await populateList(listEl, panelRef?._search.getValue().trim() ?? '');
    });

    actions.append(editBtn, deleteBtn);
    card.addEventListener('click', () => { void openProject(); });
    card.append(iconEl, body, openBtn, actions);
    return card;
  }

  // ── build ─────────────────────────────────────────────────────────────────

  function build() {
    const panel = createElement('div', 'chat-projects');
    panel.hidden = true;

    // Header
    const header = createElement('div', 'chat-projects__header');
    const headerCopy = createElement('div', 'chat-projects__header-copy');
    headerCopy.append(
      createElement('h2', 'chat-projects__title', strings.title),
      createElement('p', 'chat-projects__subtitle', strings.subtitle)
    );
    header.append(headerCopy);
    panel.append(header);

    // Body
    const body = createElement('div', 'chat-projects__body');

    // ── Left: form ────────────────────────────────────────────────────────
    const formCol = createElement('div', 'chat-projects__form-col');
    const formHeading = createElement('p', 'chat-projects__form-heading', strings.newProjectHeading);
    formCol.append(formHeading);

    // Name row
    const nameRow = createElement('div', 'chat-projects__name-row');
    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.className   = 'chat-projects__name-input';
    nameInput.placeholder = strings.namePlaceholder;
    nameInput.style.webkitUserSelect = 'text';
    nameInput.style.userSelect       = 'text';
    nameInput.style.cursor           = 'text';
    nameInput.addEventListener('input', (e) => {
      draftName = e.target.value;
      syncSaveBtn();
    });
    nameRow.append(nameInput);

    // Folder row
    const folderLabel = createElement('label', 'chat-projects__info-label', strings.folderLabel);
    const folderRow   = createElement('div', 'chat-projects__folder-row');
    const folderInput = document.createElement('input');
    folderInput.type      = 'text';
    folderInput.className = 'chat-projects__folder-input';
    folderInput.placeholder = strings.folderPlaceholder;
    folderInput.readOnly  = true;
    folderInput.style.webkitUserSelect = 'text';
    folderInput.style.userSelect = 'text';
    folderInput.style.cursor = 'text';

    const folderBtn = createElement('button', 'chat-projects__folder-btn');
    folderBtn.type = 'button';
    folderBtn.textContent = strings.selectFolder;
    folderBtn.addEventListener('click', async () => {
      try {
        const selectedPath = await window.JoaniumChat.selectProjectDirectory();
        if (selectedPath) {
          draftFolderPath = selectedPath;
          folderInput.value = draftFolderPath;
        }
      } catch (error) {
        console.error('[Joanium] Failed to select folder:', error);
      }
    });
    folderRow.append(folderInput, folderBtn);

    // Cover zone
    const coverLabel = createElement('label', 'chat-projects__info-label', strings.coverLabel);
    const coverZone  = createElement('button', 'chat-projects__cover-zone');
    coverZone.type   = 'button';
    coverZone.setAttribute('aria-label', strings.coverHint);

    const coverPreview = document.createElement('img');
    coverPreview.className = 'chat-projects__cover-preview';
    coverPreview.alt = '';

    const coverPlaceholder = createElement('div', 'chat-projects__cover-placeholder');
    coverPlaceholder.append(
      createIcon('imageUpload', 'chat-projects__cover-icon'),
      createElement('span', 'chat-projects__cover-hint', strings.coverHint)
    );

    const coverOverlay = createElement('div', 'chat-projects__cover-overlay');
    coverOverlay.append(
      createIcon('imageUpload', 'chat-projects__cover-icon'),
      createElement('span', 'chat-projects__cover-hint', strings.changeCover)
    );

    coverZone.append(coverPreview, coverPlaceholder, coverOverlay);

    function syncCoverZone() {
      const coverUrl = getProjectCoverUrl(draftCoverImagePath);
      coverZone.classList.toggle('chat-projects__cover-zone--filled', Boolean(coverUrl));
      coverPreview.src = coverUrl;
    }

    coverZone.addEventListener('click', async () => {
      try {
        const selectedPath = await window.JoaniumChat.selectProjectCover();
        if (!selectedPath) return;
        draftCoverImagePath = selectedPath;
        syncCoverZone();
      } catch (error) {
        console.error('[Joanium] Failed to select project cover:', error);
      }
    });

    // Info textarea
    const infoLabel    = createElement('label', 'chat-projects__info-label', strings.infoLabel);
    const infoTextarea = document.createElement('textarea');
    infoTextarea.className   = 'chat-projects__info-textarea';
    infoTextarea.placeholder = strings.infoPlaceholder;
    infoTextarea.rows        = 5;
    infoTextarea.style.webkitUserSelect = 'text';
    infoTextarea.style.userSelect       = 'text';
    infoTextarea.style.cursor           = 'text';
    infoTextarea.addEventListener('input', (e) => { draftInfo = e.target.value; });

    // Action buttons
    const formActions = createElement('div', 'chat-projects__form-actions');

    const cancelBtn = createElement('button', 'chat-projects__btn-cancel');
    cancelBtn.type  = 'button';
    cancelBtn.textContent = strings.cancel;

    const saveBtn = createElement('button', 'chat-projects__btn-save');
    saveBtn.type     = 'button';
    saveBtn.disabled = true;
    saveBtn.textContent = strings.save;

    function syncSaveBtn() {
      saveBtn.disabled = !draftName.trim();
    }

    function syncFormChrome() {
      formHeading.textContent = editingProjectId
        ? strings.editProjectHeading
        : strings.newProjectHeading;
      saveBtn.textContent = editingProjectId
        ? strings.update
        : strings.save;
    }

    function resetProjectForm() {
      editingProjectId        = null;
      editingProjectCreatedAt = null;
      draftName           = '';
      draftIcon           = '📁';
      draftInfo           = '';
      draftCoverImagePath = '';
      draftFolderPath     = '';
      nameInput.value     = '';
      folderInput.value   = '';
      infoTextarea.value  = '';
      syncCoverZone();
      syncFormChrome();
      syncSaveBtn();
    }

    function applyProjectToForm(project) {
      editingProjectId        = project.id;
      editingProjectCreatedAt = project.createdAt ?? null;
      draftName           = project.name ?? '';
      draftIcon           = project.icon ?? '📁';
      draftInfo           = project.info ?? '';
      draftCoverImagePath = project.coverImagePath ?? '';
      draftFolderPath     = project.folderPath ?? '';
      nameInput.value     = draftName;
      folderInput.value   = draftFolderPath;
      infoTextarea.value  = draftInfo;
      syncCoverZone();
      syncFormChrome();
      syncSaveBtn();
      nameInput.focus();
      nameInput.select();
    }

    saveBtn.addEventListener('click', async () => {
      const name = draftName.trim();
      if (!name) return;

      const now = new Date().toISOString();
      const project = {
        id:             editingProjectId ?? createProjectId(name),
        name,
        icon:           draftIcon,
        info:           draftInfo.trim(),
        folderPath:     draftFolderPath.trim(),
        coverImagePath: draftCoverImagePath.trim(),
        createdAt:      editingProjectCreatedAt ?? now,
        updatedAt:      now
      };

      try {
        await window.JoaniumChat.saveProject(project);
      } catch (err) {
        console.error('[Joanium] Failed to save project:', err);
        return;
      }

      resetProjectForm();
      await populateList(panel._listEl, panel._search.getValue().trim());
    });

    cancelBtn.addEventListener('click', resetProjectForm);

    formActions.append(cancelBtn, saveBtn);
    const formCard = createElement('div', 'chat-projects__form-card');
    formCard.append(
      nameRow,
      folderLabel,
      folderRow,
      coverLabel,
      coverZone,
      infoLabel,
      infoTextarea,
      formActions
    );
    formCol.append(formCard);

    // ── Right: list ───────────────────────────────────────────────────────
    const listCol = createElement('div', 'chat-projects__list-col');
    listCol.append(createElement('p', 'chat-projects__list-heading', strings.yourProjects));

    const searchWrap = createElement('div', 'chat-projects__list-search');
    const search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(listContent, value.trim())
    });
    search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(search.element);

    const listContent = createElement('div', 'chat-projects__list-content');
    listCol.append(searchWrap, listContent);

    body.append(formCol, listCol);
    panel.append(body);

    panel._listEl    = listContent;
    panel._search    = search;
    panel._startEdit = applyProjectToForm;
    panel._resetForm = resetProjectForm;
    syncFormChrome();
    syncCoverZone();

    panelRef = panel;
    return panel;
  }

  return { build, populateList };
}
