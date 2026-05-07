import { createElement } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';


export function createSkillsPanel(strings) {
  let panel = null;
  let _listEl = null;
  let _search = null;
  let _viewerEl = null;

  function build() {
    panel = createElement('div', 'chat-skills');
    panel.hidden = true;

    // Header — title + subtitle stacked, drag region
    panel.append(createPanelHeader({ title: strings.title, subtitle: strings.subtitle }));

    const body = createElement('div', 'chat-skills__body');

    // Left column — frosted-glass card containing search + scrollable list
    const listCol  = createElement('div', 'chat-skills__list-col');
    const listCard = createElement('div', 'chat-skills__list-card');

    const searchWrap = createElement('div', 'chat-skills__list-search');
    _search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(_listEl, value.trim())
    });
    _search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(_search.element);

    _listEl = createElement('div', 'chat-skills__list-content');
    listCard.append(searchWrap, _listEl);
    listCol.append(listCard);

    // Right column — white viewer card (scrolls internally)
    const viewerCol = createElement('div', 'chat-skills__viewer-col');
    _viewerEl = createElement('div', 'chat-skills__viewer-card');
    _viewerEl.append(
      createElement('div', 'chat-skills__viewer-empty', strings.selectPrompt ?? 'Select a skill to read its content')
    );
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
      skills = await invokeIpc('skills:list-skills');
    } catch {
      skills = [];
    }

    const q = collapseWhitespace(query).toLowerCase();
    const filtered = q
      ? skills.filter(s =>
          collapseWhitespace(s.name).toLowerCase().includes(q) ||
          collapseWhitespace(s.description).toLowerCase().includes(q) ||
          collapseWhitespace(s.namespace).toLowerCase().includes(q)
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
      fullSkill = await invokeIpc('skills:load-skill', skill.namespace, skill.filename);
    } catch (err) {
      console.error('[Joanium] Failed to load skill for viewer:', err);
      return;
    }

    _viewerEl.replaceChildren();

    // ── Viewer header ──────────────────────────────────────────────────────
    const header = createElement('div', 'chat-skills__viewer-header');

    const headerLeft = createElement('div', 'chat-skills__viewer-header-left');
    headerLeft.append(createElement('h3', 'chat-skills__viewer-title', fullSkill.name));

    const author = createElement('div', 'chat-skills__viewer-author');
    author.append(
      createElement('span', 'chat-skills__viewer-author-label', strings.author ?? 'Author'),
      createElement('span', 'chat-skills__viewer-author-value', fullSkill.namespace)
    );
    headerLeft.append(author);
    header.append(headerLeft);
    _viewerEl.append(header);

    // ── Trigger meta ───────────────────────────────────────────────────────
    if (fullSkill.trigger) {
      const meta    = createElement('div', 'chat-skills__viewer-meta');
      const trigger = createElement('div', 'chat-skills__viewer-trigger');
      trigger.append(
        createElement('span', 'chat-skills__viewer-trigger-label', strings.trigger),
        createElement('span', 'chat-skills__viewer-trigger-value', fullSkill.trigger)
      );
      meta.append(trigger);
      _viewerEl.append(meta);
    }

    // ── Markdown content ───────────────────────────────────────────────────
    const content = createElement('div', 'chat-skills__viewer-content');
    content.append(renderMarkdown(fullSkill.content, 'chat-skills__viewer-md'));
    _viewerEl.append(content);
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
        await invokeIpc('skills:delete-skill', skill.namespace, skill.filename);
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
