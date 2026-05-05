import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { createIcon } from '../../Shared/Icons/Icons.js';


// ---------------------------------------------------------------------------
// Panel factory
// ---------------------------------------------------------------------------

export function createPersonasPanel(strings, { getActivePersona, onActivatePersona }) {
  let panel    = null;
  let _listEl  = null;
  let _search  = null;
  let _viewerEl = null;

  // ── build ────────────────────────────────────────────────────────────────

  function build() {
    panel = createElement('div', 'chat-personas');
    panel.hidden = true;

    // Header — title + subtitle stacked, drag region
    const header     = createElement('div', 'chat-personas__header');
    const headerText = createElement('div', 'chat-personas__header-text');
    headerText.append(
      createElement('h2', 'chat-personas__title',    strings.title),
      createElement('p',  'chat-personas__subtitle', strings.subtitle)
    );
    header.append(headerText);
    panel.append(header);

    // Two-column body
    const body = createElement('div', 'chat-personas__body');

    // Left column — frosted-glass card containing search + scrollable list
    const listCol  = createElement('div', 'chat-personas__list-col');
    const listCard = createElement('div', 'chat-personas__list-card');

    const searchWrap = createElement('div', 'chat-personas__list-search');
    _search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(_listEl, value.trim())
    });
    _search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(_search.element);

    _listEl = createElement('div', 'chat-personas__list-content');
    listCard.append(searchWrap, _listEl);
    listCol.append(listCard);

    // Right column — white viewer card (scrolls internally)
    const viewerCol = createElement('div', 'chat-personas__viewer-col');
    _viewerEl = createElement('div', 'chat-personas__viewer-card');
    _viewerEl.append(
      createElement('div', 'chat-personas__viewer-empty', strings.selectPrompt ?? 'Select a persona to read its content')
    );
    viewerCol.append(_viewerEl);

    body.append(listCol, viewerCol);
    panel.append(body);

    // Expose sub-elements for external callers (e.g. populateList on mount)
    panel._listEl   = _listEl;
    panel._search   = _search;
    panel._viewerEl = _viewerEl;

    return panel;
  }

  // ── populateList ─────────────────────────────────────────────────────────

  async function populateList(listEl, query = '') {
    listEl.replaceChildren();

    // Show skeletons while loading
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'chat-personas__skeleton'));
    }

    let personas;
    try {
      personas = await invokeIpc('personas:list-personas');
    } catch {
      personas = [];
    }

    const q        = query.toLowerCase();
    const filtered = q
      ? personas.filter(p =>
          p.name.toLowerCase().includes(q)        ||
          p.description.toLowerCase().includes(q) ||
          p.namespace.toLowerCase().includes(q)
        )
      : personas;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-personas__empty');
      empty.append(
        createElement('p', 'chat-personas__empty-title', q ? strings.noResults    : strings.empty),
        createElement('p', 'chat-personas__empty-hint',  q ? strings.noResultsHint : strings.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const persona of filtered) {
      listEl.append(buildCard(persona, listEl));
    }
  }

  // ── populateViewer ───────────────────────────────────────────────────────

  async function populateViewer(persona) {
    if (!_viewerEl) return;

    let fullPersona;
    try {
      fullPersona = await invokeIpc('personas:load-persona', persona.namespace, persona.filename);
    } catch (err) {
      console.error('[Joanium] Failed to load persona for viewer:', err);
      return;
    }

    _viewerEl.replaceChildren();

    const activePersona = getActivePersona();
    const isActive      = activePersona?.id === persona.id;

    // ── Viewer header ──────────────────────────────────────────────────────
    const header = createElement('div', 'chat-personas__viewer-header');

    const headerLeft = createElement('div', 'chat-personas__viewer-header-left');
    headerLeft.append(createElement('h3', 'chat-personas__viewer-title', fullPersona.name));

    const author = createElement('div', 'chat-personas__viewer-author');
    author.append(
      createElement('span', 'chat-personas__viewer-author-label', strings.author ?? 'Author'),
      createElement('span', 'chat-personas__viewer-author-value', fullPersona.namespace)
    );
    headerLeft.append(author);

    const activateBtn = createElement(
      'button',
      `chat-personas__viewer-activate${isActive ? ' chat-personas__viewer-activate--active' : ''}`
    );
    activateBtn.type        = 'button';
    activateBtn.textContent = isActive ? strings.active : strings.activate;
    activateBtn.addEventListener('click', async () => {
      onActivatePersona(isActive ? null : fullPersona);
      void populateViewer(persona);
      void populateList(_listEl, _search.getValue().trim());
    });

    header.append(headerLeft, activateBtn);
    _viewerEl.append(header);

    // ── Markdown content ───────────────────────────────────────────────────
    const content = createElement('div', 'chat-personas__viewer-content');
    content.append(renderMarkdown(fullPersona.content, 'chat-personas__viewer-md'));
    _viewerEl.append(content);
  }

  // ── buildCard ─────────────────────────────────────────────────────────────

  function buildCard(persona, listEl) {
    const activePersona = getActivePersona();
    const isActive      = activePersona?.id === persona.id;

    const card = createElement(
      'div',
      `chat-personas__card${isActive ? ' chat-personas__card--active' : ''}`
    );

    card.addEventListener('click', () => {
      listEl.querySelectorAll('.chat-personas__card--active')
        .forEach(el => el.classList.remove('chat-personas__card--active'));
      card.classList.add('chat-personas__card--active');
      void populateViewer(persona);
    });

    // Card text body
    const body = createElement('div', 'chat-personas__card-body');
    body.append(createElement('span', 'chat-personas__card-name', persona.name));
    if (persona.description) {
      body.append(createElement('div', 'chat-personas__card-desc', persona.description));
    }

    // Actions — delete button (hidden for protected personas)
    const actions = createElement('div', 'chat-personas__card-actions');

    if (!persona.protected) {
      const deleteBtn = createElement('button', 'chat-personas__card-btn chat-personas__card-btn--danger');
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('aria-label', strings.delete);
      deleteBtn.append(createIcon('trash', 'chat-personas__card-btn-icon'));
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await invokeIpc('personas:delete-persona', persona.namespace, persona.filename);
          const currentActive = getActivePersona();
          if (currentActive?.id === persona.id) onActivatePersona(null);
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

  // ── Public interface ──────────────────────────────────────────────────────

  return { build, populateList };
}
