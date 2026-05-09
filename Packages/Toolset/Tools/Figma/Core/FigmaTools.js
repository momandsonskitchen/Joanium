import {
  formatDate,
  formatList,
  parseCommaList,
  requireConnectorCredentials,
  requireText,
  truncateText
} from '../../../Core/ConnectorHttp.js';

const FIGMA_API = 'https://api.figma.com/v1';

async function figmaRequest(rootDirectory, path, { method = 'GET', body, searchParams = {} } = {}) {
  const credentials = await requireConnectorCredentials(rootDirectory, 'figma', ['token'], 'Figma');
  const url = new URL(`${FIGMA_API}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-figma-token': credentials.token
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${data?.err ?? data?.message ?? 'Figma request failed'}`);
  return data;
}

function summarizeNode(node, depth = 0, rows = []) {
  if (!node || rows.length >= 40) return rows;
  rows.push(`${'  '.repeat(depth)}- ${node.name ?? '(unnamed)'} [${node.type ?? 'node'}]`);
  for (const child of node.children ?? []) summarizeNode(child, depth + 1, rows);
  return rows;
}

export function createFigmaToolHandlers({ rootDirectory }) {
  return {
    async figma_get_file(params = {}) {
      const fileKey = encodeURIComponent(requireText(params.file_key ?? params.fileKey, 'file_key'));
      const file = await figmaRequest(rootDirectory, `/files/${fileKey}`);
      return [
        `Figma file: ${file.name}`,
        `Last modified: ${formatDate(file.lastModified)}`,
        `Version: ${file.version}`,
        '',
        'Document summary:',
        ...summarizeNode(file.document)
      ].join('\n');
    },

    async figma_get_file_nodes(params = {}) {
      const fileKey = encodeURIComponent(requireText(params.file_key ?? params.fileKey, 'file_key'));
      const nodeIds = parseCommaList(requireText(params.node_ids ?? params.nodeIds, 'node_ids'));
      const data = await figmaRequest(rootDirectory, `/files/${fileKey}/nodes`, {
        searchParams: { ids: nodeIds.join(',') }
      });
      return ['Figma nodes', '', truncateText(JSON.stringify(data.nodes ?? {}, null, 2), 6000)].join('\n');
    },

    async figma_list_comments(params = {}) {
      const fileKey = encodeURIComponent(requireText(params.file_key ?? params.fileKey, 'file_key'));
      const data = await figmaRequest(rootDirectory, `/files/${fileKey}/comments`);
      return formatList('Figma comments', (data.comments ?? []).map((comment, index) => `${index + 1}. ${comment.user?.handle ?? 'unknown'} - ${formatDate(comment.created_at)}\n   ${truncateText(comment.message ?? '', 300)}`));
    },

    async figma_post_comment(params = {}) {
      const fileKey = encodeURIComponent(requireText(params.file_key ?? params.fileKey, 'file_key'));
      const message = requireText(params.message, 'message');
      const comment = await figmaRequest(rootDirectory, `/files/${fileKey}/comments`, {
        method: 'POST',
        body: { message }
      });
      return [`Figma comment posted`, `ID: ${comment.id ?? '(unknown)'}`].join('\n');
    },

    async figma_get_versions(params = {}) {
      const fileKey = encodeURIComponent(requireText(params.file_key ?? params.fileKey, 'file_key'));
      const data = await figmaRequest(rootDirectory, `/files/${fileKey}/versions`);
      return formatList('Figma versions', (data.versions ?? []).map((version, index) => `${index + 1}. ${version.label || version.id}\n   User: ${version.user?.handle ?? 'unknown'} | Created: ${formatDate(version.created_at)}`));
    }
  };
}
