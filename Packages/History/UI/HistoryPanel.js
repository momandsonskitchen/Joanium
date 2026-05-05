import { createElement } from '../../Shared/Utils/DomUtils.js';
import { formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';

// ---------------------------------------------------------------------------
// Icons — only the subset needed by the History panel.
// ---------------------------------------------------------------------------

const iconMarkup = {
  tabChat: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  `,
  pin: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z" />
    </svg>
  `,
  pinFill: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 17v5" />
      <path fill="currentColor" stroke="none" d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z" />
    </svg>
  `,
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

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getSessionGroup(isoString) {
  const date = new Date(isoString);
  const now  = new Date();
  const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay       = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime())     return 'today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'yesterday';
  return 'earlier';
}

function formatSessionTime(isoString) {
  const date = new Date(isoString);
  const now  = new Date();
  const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfDay       = new Date(date.getFullYear(), date.getMonth(), date.getDate());

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

export function createHistoryPanel(strings, {
  onNewChat,
  onLoadSession,
  getCurrentSessionId,
  getActiveProject
} = {}) {
  // Reference to the built panel element — set after build() is called.
  let panelRef = null;

  // ── Session card — inline rename helper ────────────────────────────────

  function startInlineRename(session, titleEl, contentEl, query) {
    const input = document.createElement('input');
    input.className = 'chat-history__card-title-input';
    input.type      = 'text';
    input.value     = session.title || '';
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
          await window.JoaniumChat.renameSession(
            session.id,
            newTitle,
            getActiveProject?.()?.id
          );
        } catch (err) {
          console.error('[Joanium] Failed to rename session:', err);
        }
      }
      await populateList(contentEl, query);
    };

    const blurHandler = () => void finish(true);
    input.addEventListener('blur', blurHandler);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); void finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); void finish(false); }
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
    body.type  = 'button';

    const msgCount = session.messageCount ?? 0;
    const msgLabel = msgCount === 1
      ? strings.oneMessage
      : formatText(strings.messages, { count: msgCount });

    const titleEl = createElement('div', 'chat-history__card-title', session.title || strings.appName);
    const metaEl  = createElement('div', 'chat-history__card-meta', `${msgLabel} · ${formatSessionTime(session.updatedAt)}`);
    body.append(titleEl, metaEl);
    body.addEventListener('click', () => void onLoadSession?.(session.id));

    // Actions — visible on hover
    const actions = createElement('div', 'chat-history__card-actions');

    // Pin / Unpin
    const pinBtn  = createElement('button', `chat-history__card-btn${session.pinned ? ' chat-history__card-btn--pinned' : ''}`);
    pinBtn.type   = 'button';
    pinBtn.setAttribute('aria-label', session.pinned ? strings.unpin : strings.pin);
    const pinIcon = createElement('span', 'chat-history__card-btn-icon');
    pinIcon.innerHTML = session.pinned ? iconMarkup.pinFill : iconMarkup.pin;
    pinBtn.append(pinIcon);
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.pinSession(
          session.id,
          !session.pinned,
          getActiveProject?.()?.id
        );
      } catch (err) {
        console.error('[Joanium] Failed to pin session:', err);
      }
      await populateList(contentEl, query);
    });

    // Rename
    const renameBtn  = createElement('button', 'chat-history__card-btn');
    renameBtn.type   = 'button';
    renameBtn.setAttribute('aria-label', strings.rename);
    const renameIcon = createElement('span', 'chat-history__card-btn-icon');
    renameIcon.innerHTML = iconMarkup.pencil;
    renameBtn.append(renameIcon);
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineRename(session, titleEl, contentEl, query);
    });

    // Delete
    const deleteBtn  = createElement('button', 'chat-history__card-btn chat-history__card-btn--danger');
    deleteBtn.type   = 'button';
    deleteBtn.setAttribute('aria-label', strings.deleteChat);
    const deleteIcon = createElement('span', 'chat-history__card-btn-icon');
    deleteIcon.innerHTML = iconMarkup.trash;
    deleteBtn.append(deleteIcon);
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteSession(
          session.id,
          getActiveProject?.()?.id
        );
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

    const allSessions = await window.JoaniumChat.listSessions(getActiveProject?.()?.id);

    // Filter by query — title match, case-insensitive
    const q = query.toLowerCase();
    const sessions = q
      ? allSessions.filter((s) => (s.title ?? '').toLowerCase().includes(q))
      : allSessions;

    contentEl.replaceChildren();

    if (allSessions.length === 0) {
      const empty = createElement('div', 'chat-history__empty');
      empty.append(
        createElement('p', 'chat-history__empty-title', strings.empty),
        createElement('p', 'chat-history__empty-hint',  strings.emptyHint)
      );
      contentEl.append(empty);
      return;
    }

    if (sessions.length === 0) {
      const empty = createElement('div', 'chat-history__empty');
      empty.append(
        createElement('p', 'chat-history__empty-title', strings.noResults),
        createElement('p', 'chat-history__empty-hint',  strings.noResultsHint)
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
      pinned:    strings.pinned,
      today:     strings.today,
      yesterday: strings.yesterday,
      earlier:   strings.earlier
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
    const header      = createElement('div', 'chat-history__header');
    const headerTitle = createElement('h2', 'chat-history__title', strings.title);

    const newBtn = createElement('button', 'chat-history__new-btn');
    newBtn.type  = 'button';
    const newIconEl = createElement('span', 'chat-history__new-icon');
    newIconEl.innerHTML = iconMarkup.tabChat ?? '';
    newBtn.append(newIconEl, createElement('span', 'chat-history__new-label', strings.newChat));
    newBtn.addEventListener('click', () => onNewChat?.());

    header.append(headerTitle, newBtn);

    // Search bar
    const searchWrap  = createElement('div', 'chat-history__search-wrap');
    const searchInner = createElement('div', 'chat-history__search-inner');

    const search = createSearchBar({
      placeholder: strings.search,
      onChange:    (value) => void populateList(contentEl, value.trim())
    });

    // Prevent Electron drag-region from swallowing input events
    search.element.style.webkitAppRegion = 'no-drag';

    searchInner.append(search.element);
    searchWrap.append(searchInner);

    // Session list
    const contentEl = createElement('div', 'chat-history__content');

    panel.append(header, searchWrap, contentEl);

    // Expose internal refs used by the caller (ChatApp) for refresh + search clear
    panel._contentEl = contentEl;
    panel._search    = search;

    panelRef = panel;
    return panel;
  }

  return { build, populateList };
}
