import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getSessionGroup(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return 'today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'yesterday';
  return 'earlier';
}

function formatSessionTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() >= startOfToday.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (startOfDay.getTime() >= startOfYesterday.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// createHistoryPanel
//
// Factory that builds and manages the History sidebar panel.
//
// Parameters:
//   strings  — the `history` i18n namespace (strings.history from caller)
//   options  — {
//     onNewChat()              — callback: start a fresh conversation
//     onLoadSession(session)   — callback: restore a saved session into chat
//     getCurrentSessionId()    — getter: returns the active session ID (or null)
//     getActiveProject()       — getter: returns the active project (or null)
//   }
//
// Returns:
//   build()        — builds and returns the panel HTMLElement (call once)
//   populateList() — re-fetches and re-renders session cards into the panel
// ---------------------------------------------------------------------------

export function createHistoryPanel(
  strings,
  { onNewChat, onLoadSession, getCurrentSessionId, getActiveProject } = {},
) {
  // ── Session card — inline rename helper ────────────────────────────────

  function startInlineRename(session, titleEl, contentEl, query) {
    const input = document.createElement('input');
    input.className = 'chat-history__card-title-input';
    input.type = 'text';
    input.value = session.title || '';
    input.style.webkitAppRegion = 'no-drag';
    input.style.webkitUserSelect = 'text';
    input.style.userSelect = 'text';
    input.style.cursor = 'text';

    let committed = false;

    const finish = async (save) => {
      if (committed) return;
      committed = true;
      input.removeEventListener('blur', blurHandler);
      const newTitle = input.value.trim();
      if (save && newTitle && newTitle !== session.title) {
        try {
          await invokeIpc('history:rename-session', session.id, newTitle, getActiveProject?.()?.id);
        } catch (err) {
          console.error('[Joanium] Failed to rename session:', err);
        }
      }
      await populateList(contentEl, query);
    };

    const blurHandler = () => void finish(true);
    input.addEventListener('blur', blurHandler);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void finish(true);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        void finish(false);
      }
    });

    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  // ── Session card builder ───────────────────────────────────────────────

  function buildSessionCard(session, contentEl, query) {
    const card = createElement('div', 'chat-history__card');

    // Body — main click target
    const body = createElement('button', 'chat-history__card-body');
    body.type = 'button';

    const msgCount = session.messageCount ?? 0;
    const msgLabel =
      msgCount === 1 ? strings.oneMessage : formatText(strings.messages, { count: msgCount });

    const titleEl = createElement(
      'div',
      'chat-history__card-title',
      session.title || strings.appName,
    );
    const metaEl = createElement(
      'div',
      'chat-history__card-meta',
      `${msgLabel} · ${formatSessionTime(session.updatedAt)}`,
    );
    body.append(titleEl, metaEl);
    body.addEventListener('click', () => void onLoadSession?.(session.id));

    // Actions — visible on hover
    const actions = createElement('div', 'chat-history__card-actions');

    // Pin / Unpin
    const pinBtn = createElement(
      'button',
      `chat-history__card-btn${session.pinned ? ' chat-history__card-btn--pinned' : ''}`,
    );
    pinBtn.type = 'button';
    pinBtn.setAttribute('aria-label', session.pinned ? strings.unpin : strings.pin);
    pinBtn.append(createIcon(session.pinned ? 'pinFill' : 'pin', 'chat-history__card-btn-icon'));
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await invokeIpc(
          'history:pin-session',
          session.id,
          !session.pinned,
          getActiveProject?.()?.id,
        );
      } catch (err) {
        console.error('[Joanium] Failed to pin session:', err);
      }
      await populateList(contentEl, query);
    });

    // Rename
    const renameBtn = createElement('button', 'chat-history__card-btn');
    renameBtn.type = 'button';
    renameBtn.setAttribute('aria-label', strings.rename);
    renameBtn.append(createIcon('pencil', 'chat-history__card-btn-icon'));
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineRename(session, titleEl, contentEl, query);
    });

    // Delete
    const deleteBtn = createElement(
      'button',
      'chat-history__card-btn chat-history__card-btn--danger',
    );
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', strings.deleteChat);
    deleteBtn.append(createIcon('trash', 'chat-history__card-btn-icon'));
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await invokeIpc('history:delete-session', session.id, getActiveProject?.()?.id);
        // If the deleted session is currently open, clear the conversation
        if (session.id === getCurrentSessionId?.()) {
          onNewChat?.();
        }
      } catch (err) {
        console.error('[Joanium] Failed to delete session:', err);
      }
      await populateList(contentEl, query);
    });

    actions.append(pinBtn, renameBtn, deleteBtn);
    card.append(body, actions);
    return card;
  }

  // ── populateList — fetches sessions and renders them into contentEl ────

  async function populateList(contentEl, query = '') {
    // Show loading skeletons while fetching
    contentEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      contentEl.append(createElement('div', 'chat-history__skeleton'));
    }

    const allSessions = await invokeIpc('history:list-sessions', getActiveProject?.()?.id);

    // Filter by query — title match, case-insensitive
    const q = collapseWhitespace(query).toLowerCase();
    const sessions = q
      ? allSessions.filter((s) =>
          collapseWhitespace(s.title ?? '')
            .toLowerCase()
            .includes(q),
        )
      : allSessions;

    contentEl.replaceChildren();

    if (allSessions.length === 0) {
      const empty = createElement('div', 'chat-history__empty');
      empty.append(
        createElement('p', 'chat-history__empty-title', strings.empty),
        createElement('p', 'chat-history__empty-hint', strings.emptyHint),
      );
      contentEl.append(empty);
      return;
    }

    if (sessions.length === 0) {
      const empty = createElement('div', 'chat-history__empty');
      empty.append(
        createElement('p', 'chat-history__empty-title', strings.noResults),
        createElement('p', 'chat-history__empty-hint', strings.noResultsHint),
      );
      contentEl.append(empty);
      return;
    }

    // Pinned sessions go first; non-pinned are grouped by date
    const groups = { pinned: [], today: [], yesterday: [], earlier: [] };
    for (const session of sessions) {
      if (session.pinned) {
        groups.pinned.push(session);
      } else {
        groups[getSessionGroup(session.updatedAt)].push(session);
      }
    }

    const groupLabels = {
      pinned: strings.pinned,
      today: strings.today,
      yesterday: strings.yesterday,
      earlier: strings.earlier,
    };

    for (const [groupKey, groupSessions] of Object.entries(groups)) {
      if (groupSessions.length === 0) continue;

      const section = createElement('div', 'chat-history__section');
      section.append(createElement('div', 'chat-history__section-label', groupLabels[groupKey]));

      for (const session of groupSessions) {
        section.append(buildSessionCard(session, contentEl, query));
      }

      contentEl.append(section);
    }
  }

  // ── build — constructs the panel DOM (called once) ─────────────────────

  function build() {
    const panel = createElement('div', 'chat-history');
    panel.hidden = true;

    // Header row
    const header = createPanelHeader({ title: strings.title, subtitle: strings.subtitle });

    // Search bar + New Chat button row
    const searchWrap = createElement('div', 'chat-history__search-wrap');
    const searchInner = createElement('div', 'chat-history__search-inner');

    const newBtn = createElement('button', 'chat-history__new-btn');
    newBtn.type = 'button';
    newBtn.append(
      createIcon('tabChat', 'chat-history__new-icon'),
      createElement('span', 'chat-history__new-label', strings.newChat),
    );
    newBtn.addEventListener('click', () => onNewChat?.());

    const search = createSearchBar({
      placeholder: strings.search,
      onChange: (value) => void populateList(contentEl, value.trim()),
    });

    search.element.style.webkitAppRegion = 'no-drag';

    searchInner.append(search.element, newBtn);
    searchWrap.append(searchInner);

    // Session list
    const contentEl = createElement('div', 'chat-history__content');

    panel.append(header, searchWrap, contentEl);

    // Expose internal refs used by the caller (ChatApp) for refresh + search clear
    panel._contentEl = contentEl;
    panel._search = search;

    return panel;
  }

  return { build, populateList };
}
