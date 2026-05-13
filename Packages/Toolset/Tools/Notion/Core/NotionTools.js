import {
  clampInteger,
  formatDate,
  formatList,
  parseJsonObject,
  parseResponseJson,
  requireConnectorCredentials,
  requireText,
  truncateText,
} from '../../../Core/ConnectorHttp.js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionRequest(rootDirectory, path, { method = 'GET', body } = {}) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'notion',
    ['token'],
    'Notion',
  );
  const response = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${credentials.token}`,
      'notion-version': NOTION_VERSION,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const { data, text } = await parseResponseJson(response);
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}: ${data?.message ?? text}`);
  return data;
}

function richTextToPlain(items = []) {
  return items.map((item) => item.plain_text ?? item.text?.content ?? '').join('');
}

function getTitle(value = {}) {
  if (value.object === 'database') return richTextToPlain(value.title) || value.id;
  if (value.object === 'page') {
    const titleProperty = Object.values(value.properties ?? {}).find(
      (property) => property.type === 'title',
    );
    return richTextToPlain(titleProperty?.title ?? []) || value.id;
  }
  return value.id ?? '(unknown)';
}

function formatResult(item, index = null) {
  return [
    `${index == null ? '' : `${index + 1}. `}${getTitle(item)}`,
    `Type: ${item.object}`,
    `ID: ${item.id}`,
    `Updated: ${formatDate(item.last_edited_time)}`,
    item.url ? `URL: ${item.url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function titleProperty(title) {
  return { title: [{ text: { content: title } }] };
}

function paragraphBlock(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: text } }],
    },
  };
}

export function createNotionToolHandlers({ rootDirectory }) {
  return {
    async notion_search(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 25);
      const filter = String(params.filter ?? 'all')
        .trim()
        .toLowerCase();
      const body = {
        query: String(params.query ?? '').trim(),
        page_size: limit,
      };
      if (filter === 'page' || filter === 'database') {
        body.filter = { value: filter, property: 'object' };
      }
      const data = await notionRequest(rootDirectory, '/search', { method: 'POST', body });
      return formatList('Notion search results', (data.results ?? []).map(formatResult));
    },

    async notion_get_page(params = {}) {
      const page = await notionRequest(
        rootDirectory,
        `/pages/${encodeURIComponent(requireText(params.page_id ?? params.pageId, 'page_id'))}`,
      );
      const properties = Object.entries(page.properties ?? {}).map(
        ([name, property]) => `${name}: ${property.type}`,
      );
      return [formatResult(page), '', 'Properties:', ...properties].join('\n');
    },

    async notion_get_database(params = {}) {
      const database = await notionRequest(
        rootDirectory,
        `/databases/${encodeURIComponent(requireText(params.database_id ?? params.databaseId, 'database_id'))}`,
      );
      const properties = Object.entries(database.properties ?? {}).map(
        ([name, property]) => `${name}: ${property.type}`,
      );
      return [formatResult(database), '', 'Properties:', ...properties].join('\n');
    },

    async notion_query_database(params = {}) {
      const databaseId = encodeURIComponent(
        requireText(params.database_id ?? params.databaseId, 'database_id'),
      );
      const limit = clampInteger(params.limit, 10, 1, 25);
      const body = { page_size: limit };
      if (params.filter) body.filter = parseJsonObject(params.filter);
      if (params.sorts) {
        const sorts = typeof params.sorts === 'string' ? JSON.parse(params.sorts) : params.sorts;
        if (!Array.isArray(sorts)) throw new Error('sorts must be a JSON array.');
        body.sorts = sorts;
      }
      const data = await notionRequest(rootDirectory, `/databases/${databaseId}/query`, {
        method: 'POST',
        body,
      });
      return formatList('Notion database rows', (data.results ?? []).map(formatResult));
    },

    async notion_create_page(params = {}) {
      const parentId = requireText(params.parent_id ?? params.parentId, 'parent_id');
      const parentType = String(params.parent_type ?? params.parentType ?? 'page')
        .trim()
        .toLowerCase();
      const title = requireText(params.title, 'title');
      const parent = parentType === 'database' ? { database_id: parentId } : { page_id: parentId };
      const body = {
        parent,
        properties:
          parentType === 'database'
            ? { Name: titleProperty(title) }
            : { title: titleProperty(title) },
        children: params.content ? [paragraphBlock(truncateText(params.content, 1800))] : [],
      };
      const page = await notionRequest(rootDirectory, '/pages', { method: 'POST', body });
      return [
        `Notion page created`,
        `Title: ${getTitle(page)}`,
        `ID: ${page.id}`,
        `URL: ${page.url}`,
      ].join('\n');
    },

    async notion_append_block(params = {}) {
      const blockId = encodeURIComponent(
        requireText(params.block_id ?? params.blockId, 'block_id'),
      );
      const text = requireText(params.text, 'text');
      await notionRequest(rootDirectory, `/blocks/${blockId}/children`, {
        method: 'PATCH',
        body: { children: [paragraphBlock(truncateText(text, 1800))] },
      });
      return `Appended a paragraph block to ${params.block_id ?? params.blockId}.`;
    },
  };
}
