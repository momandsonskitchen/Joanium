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

export function createSkillsPanel(strings) {
  let panel = null;
  let _listEl = null;
  let _search = null;
  let _viewerEl = null;

  function build() {
    panel = createElement('div', 'chat-skills');
    panel.hidden = true;

    const header = createElement('div', 'chat-skills__header');
    header.append(
      createElement('h2', 'chat-skills__title', strings.title),
      createElement('p', 'chat-skills__subtitle', strings.subtitle)
    );
    panel.append(header);

    const body = createElement('div', 'chat-skills__body');

    // Left column: list
    const listCol = createElement('div', 'chat-skills__list-col');
    const searchWrap = createElement('div', 'chat-skills__list-search');
    _search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(_listEl, value.trim())
    });
    _search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(_search.element);

    _listEl = createElement('div', 'chat-skills__list-content');
    listCol.append(searchWrap, _listEl);

    // Right column: viewer
    const viewerCol = createElement('div', 'chat-skills__viewer-col');
    _viewerEl = createElement('div', 'chat-skills__viewer-card');
    _viewerEl.append(createElement('div', 'chat-skills__viewer-empty', 'Select a skill to read its content'));
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
      listEl.append(createElement('div', 'chat-skills__skeleton'));
    }

    let skills;
    try {
      skills = await window.JoaniumChat.listSkills();
    } catch {
      skills = [];
    }

    const q = query.toLowerCase();
    const filtered = q
      ? skills.filter(s => 
          s.name.toLowerCase().includes(q) || 
          s.description.toLowerCase().includes(q) || 
          s.namespace.toLowerCase().includes(q)
        )
      : skills;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-skills__empty');
      empty.append(
        createElement('p', 'chat-skills__empty-title', q ? strings.noResults : strings.empty),
        createElement('p', 'chat-skills__empty-hint', q ? strings.noResultsHint : strings.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const skill of filtered) {
      listEl.append(buildCard(skill, listEl));
    }
  }

  async function populateViewer(skill) {
    if (!_viewerEl) return;

    let fullSkill;
    try {
      fullSkill = await window.JoaniumChat.loadSkill(skill.namespace, skill.filename);
    } catch (err) {
      console.error('[Joanium] Failed to load skill for viewer:', err);
      return;
    }

    _viewerEl.replaceChildren();

    const header = createElement('div', 'chat-skills__viewer-header');
    const title = createElement('h3', 'chat-skills__viewer-title', fullSkill.name);
    const author = createElement('div', 'chat-skills__viewer-author');
    author.append(
      createElement('span', 'chat-skills__viewer-author-label', 'Author'),
      createElement('span', 'chat-skills__viewer-author-value', fullSkill.namespace)
    );
    header.append(title, author);

    const meta = createElement('div', 'chat-skills__viewer-meta');
    if (fullSkill.trigger) {
      const trigger = createElement('div', 'chat-skills__viewer-trigger');
      trigger.append(
        createElement('span', 'chat-skills__viewer-trigger-label', strings.trigger),
        createElement('span', 'chat-skills__viewer-trigger-value', fullSkill.trigger)
      );
      meta.append(trigger);
    }
    
    const content = createElement('div', 'chat-skills__viewer-content');
    content.append(createElement('pre', 'chat-skills__viewer-pre', fullSkill.content));

    _viewerEl.append(header, meta, content);
  }

  function buildCard(skill, listEl) {
    const card = createElement('div', 'chat-skills__card');
    card.addEventListener('click', () => {
      listEl.querySelectorAll('.chat-skills__card--active').forEach(el => el.classList.remove('chat-skills__card--active'));
      card.classList.add('chat-skills__card--active');
      void populateViewer(skill);
    });

    const body = createElement('div', 'chat-skills__card-body');
    body.append(createElement('span', 'chat-skills__card-name', skill.name));
    if (skill.description) {
      body.append(createElement('div', 'chat-skills__card-desc', skill.description));
    }

    const actions = createElement('div', 'chat-skills__card-actions');
    const deleteBtn = createElement('button', 'chat-skills__card-btn chat-skills__card-btn--danger');
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', strings.delete);
    deleteBtn.append(createIcon('trash', 'chat-skills__card-btn-icon'));
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteSkill(skill.namespace, skill.filename);
        await populateList(listEl, _search.getValue().trim());
      } catch (err) {
        console.error('[Joanium] Failed to delete skill:', err);
      }
    });

    actions.append(deleteBtn);
    card.append(body, actions);
    return card;
  }

  return {
    build,
    populateList
  };
}
