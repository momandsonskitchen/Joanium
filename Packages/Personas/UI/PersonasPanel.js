import { createElement } from '../../Shared/Utils/DomUtils.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const iconMarkup = {
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

export function createPersonasPanel(strings, { getActivePersona, onActivatePersona }) {
  let panel = null;
  let _listEl = null;
  let _search = null;
  let _viewerEl = null;

  function build() {
    panel = createElement('div', 'chat-personas');
    panel.hidden = true;

    const header = createElement('div', 'chat-personas__header');
    header.append(
      createElement('h2', 'chat-personas__title', strings.title),
      createElement('p', 'chat-personas__subtitle', strings.subtitle)
    );
    panel.append(header);

    const body = createElement('div', 'chat-personas__body');

    // Left column: list
    const listCol = createElement('div', 'chat-personas__list-col');
    const searchWrap = createElement('div', 'chat-personas__list-search');
    _search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(_listEl, value.trim())
    });
    _search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(_search.element);

    _listEl = createElement('div', 'chat-personas__list-content');
    listCol.append(searchWrap, _listEl);

    // Right column: viewer
    const viewerCol = createElement('div', 'chat-personas__viewer-col');
    _viewerEl = createElement('div', 'chat-personas__viewer-card');
    _viewerEl.append(createElement('div', 'chat-personas__viewer-empty', 'Select a persona to read its content'));
    viewerCol.append(_viewerEl);

    body.append(listCol, viewerCol);
    panel.append(body);

    panel._listEl = _listEl;
    panel._search = _search;
    panel._viewerEl = _viewerEl;

    return panel;
  }

  async function populateList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'chat-personas__skeleton'));
    }

    let personas;
    try {
      personas = await window.JoaniumChat.listPersonas();
    } catch {
      personas = [];
    }

    const q = query.toLowerCase();
    const filtered = q
      ? personas.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q) || 
          p.namespace.toLowerCase().includes(q)
        )
      : personas;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-personas__empty');
      empty.append(
        createElement('p', 'chat-personas__empty-title', q ? strings.noResults : strings.empty),
        createElement('p', 'chat-personas__empty-hint', q ? strings.noResultsHint : strings.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const persona of filtered) {
      listEl.append(buildCard(persona, listEl));
    }
  }

  async function populateViewer(persona) {
    if (!_viewerEl) return;

    let fullPersona;
    try {
      fullPersona = await window.JoaniumChat.loadPersona(persona.namespace, persona.filename);
    } catch (err) {
      console.error('[Joanium] Failed to load persona for viewer:', err);
      return;
    }

    _viewerEl.replaceChildren();

    const activePersona = getActivePersona();
    const isActive = activePersona?.id === persona.id;

    const header = createElement('div', 'chat-personas__viewer-header');
    const title = createElement('h3', 'chat-personas__viewer-title', fullPersona.name);
    const author = createElement('div', 'chat-personas__viewer-author');
    author.append(
      createElement('span', 'chat-personas__viewer-author-label', 'Author'),
      createElement('span', 'chat-personas__viewer-author-value', fullPersona.namespace)
    );
    header.append(title, author);

    if (fullPersona.protected) {
      const badge = createElement('span', 'chat-personas__viewer-badge', strings.protected);
      header.append(badge);
    }

    const actions = createElement('div', 'chat-personas__viewer-actions');
    const activateBtn = createElement('button', `chat-personas__viewer-activate${isActive ? ' chat-personas__viewer-activate--active' : ''}`);
    activateBtn.type = 'button';
    activateBtn.textContent = isActive ? strings.active : strings.activate;
    activateBtn.addEventListener('click', async () => {
      onActivatePersona(isActive ? null : fullPersona);
      void populateViewer(persona);
      void populateList(_listEl, _search.getValue().trim());
    });
    actions.append(activateBtn);
    
    const content = createElement('div', 'chat-personas__viewer-content');
    content.append(createElement('pre', 'chat-personas__viewer-pre', fullPersona.content));

    _viewerEl.append(header, actions, content);
  }

  function buildCard(persona, listEl) {
    const activePersona = getActivePersona();
    const isActive = activePersona?.id === persona.id;
    const card = createElement('div', `chat-personas__card${isActive ? ' chat-personas__card--active' : ''}`);
    card.addEventListener('click', () => {
      listEl.querySelectorAll('.chat-personas__card--active').forEach(el => el.classList.remove('chat-personas__card--active'));
      card.classList.add('chat-personas__card--active');
      void populateViewer(persona);
    });

    const body = createElement('div', 'chat-personas__card-body');
    const nameRow = createElement('div', 'chat-personas__card-name-row');
    nameRow.append(createElement('span', 'chat-personas__card-name', persona.name));
    if (persona.protected) {
      nameRow.append(createElement('span', 'chat-personas__card-badge', strings.protected));
    }
    body.append(nameRow);
    if (persona.description) {
      body.append(createElement('div', 'chat-personas__card-desc', persona.description));
    }

    const actions = createElement('div', 'chat-personas__card-actions');
    
    if (!persona.protected) {
      const deleteBtn = createElement('button', 'chat-personas__card-btn chat-personas__card-btn--danger');
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('aria-label', strings.delete);
      deleteBtn.append(createIcon('trash', 'chat-personas__card-btn-icon'));
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await window.JoaniumChat.deletePersona(persona.namespace, persona.filename);
          const currentActive = getActivePersona();
          if (currentActive?.id === persona.id) {
            onActivatePersona(null);
          }
          await populateList(listEl, _search.getValue().trim());
        } catch (err) {
          console.error('[Joanium] Failed to delete persona:', err);
        }
      });
      actions.append(deleteBtn);
    }

    card.append(body, actions);
    return card;
  }

  return {
    build,
    populateList
  };
}
