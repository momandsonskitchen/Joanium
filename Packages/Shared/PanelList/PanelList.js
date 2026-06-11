import { createElement } from '../Utils/DomUtils.js';
import { collapseWhitespace } from '../Utils/StringUtils.js';
import { createSearchBar } from '../SearchBar/SearchBar.js';
import { attachCustomScrollbar } from '../CustomScrollbar/CustomScrollbar.js';

function createEmptyState({
  emptyClassName,
  emptyTitleClassName,
  emptyHintClassName,
  normalizedQuery,
  strings,
}) {
  const empty = createElement('div', emptyClassName);
  empty.append(
    createElement('p', emptyTitleClassName, normalizedQuery ? strings.noResults : strings.empty),
    createElement(
      'p',
      emptyHintClassName,
      normalizedQuery ? strings.noResultsHint : strings.emptyHint,
    ),
  );
  return empty;
}

function itemMatchesQuery(item, normalizedQuery, getSearchValues) {
  if (!normalizedQuery) return true;
  const haystack = getSearchValues(item)
    .map((value) => collapseWhitespace(value).toLowerCase())
    .join('\n');
  return haystack.includes(normalizedQuery);
}

export async function populateSearchableCards({
  listEl,
  query = '',
  skeletonClassName,
  skeletonCount = 3,
  loadItems,
  getSearchValues,
  buildCard,
  strings,
  emptyClassName,
  emptyTitleClassName,
  emptyHintClassName,
}) {
  listEl.replaceChildren();
  for (let index = 0; index < skeletonCount; index += 1) {
    listEl.append(createElement('div', skeletonClassName));
  }

  let items;
  try {
    items = await loadItems();
  } catch {
    items = [];
  }

  const normalizedQuery = collapseWhitespace(query).toLowerCase();
  const filteredItems = items.filter((item) =>
    itemMatchesQuery(item, normalizedQuery, getSearchValues),
  );

  listEl.replaceChildren();

  if (filteredItems.length === 0) {
    listEl.append(
      createEmptyState({
        emptyClassName,
        emptyTitleClassName,
        emptyHintClassName,
        normalizedQuery,
        strings,
      }),
    );
    return [];
  }

  for (const item of filteredItems) {
    listEl.append(buildCard(item, listEl));
  }

  return filteredItems;
}

export function createSearchableListColumn({
  classPrefix,
  heading,
  searchPlaceholder,
  onSearchChange,
}) {
  const column = createElement('div', `${classPrefix}__list-col`);
  column.append(createElement('p', `${classPrefix}__list-heading`, heading));

  const searchWrap = createElement('div', `${classPrefix}__list-search`);
  const search = createSearchBar({
    placeholder: searchPlaceholder,
    onChange: (value) => onSearchChange(value.trim()),
  });
  searchWrap.append(search.element);

  const content = createElement('div', `${classPrefix}__list-content`);
  const contentWrap = createElement('div', `${classPrefix}__list-wrap`);
  Object.assign(contentWrap.style, {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  });
  contentWrap.append(content);
  attachCustomScrollbar(contentWrap, content, { right: 4, top: 4, bottom: 4, minThumb: 24 });

  column.append(searchWrap, contentWrap);

  return { column, content, search };
}
