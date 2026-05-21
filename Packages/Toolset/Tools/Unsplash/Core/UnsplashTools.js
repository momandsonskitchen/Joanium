import {
  clampInteger,
  formatList,
  readConnectorDetails,
  readJsonResponse,
  requireText,
} from '../../../Core/ConnectorHttp.js';

const UNSPLASH_SEARCH_API = 'https://api.unsplash.com/search/photos';
const ORIENTATIONS = new Set(['landscape', 'portrait', 'squarish']);

async function readUnsplashAccessKey(rootDirectory) {
  const details = await readConnectorDetails(rootDirectory, 'unsplash');
  return String(details.apiKey ?? '').trim();
}

async function unsplashSearchPhotos(rootDirectory, params = {}) {
  const apiKey = await readUnsplashAccessKey(rootDirectory);
  if (!apiKey) {
    throw new Error('Unsplash access key is not configured in Settings > Connectors.');
  }

  const query = requireText(params.query, 'query');
  const count = clampInteger(params.count ?? params.limit, 10, 1, 30);
  const orientation = String(params.orientation ?? '')
    .trim()
    .toLowerCase();
  const url = new URL(UNSPLASH_SEARCH_API);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(count));
  if (ORIENTATIONS.has(orientation)) url.searchParams.set('orientation', orientation);

  const data = await readJsonResponse(
    await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Client-ID ${apiKey}`,
      },
    }),
  );
  const photos = data.results ?? [];
  if (!photos.length) return `No photos found for "${query}" on Unsplash.`;

  const rows = photos.map((photo) => {
    const description = photo.description || photo.alt_description || 'Untitled photo';
    const photographer = photo.user?.name ?? 'Unknown photographer';
    const pageUrl = photo.links?.html ?? '';
    const imageUrl = photo.urls?.regular ?? photo.urls?.small ?? photo.urls?.full ?? '';
    const size = photo.width && photo.height ? `${photo.width}x${photo.height}` : 'unknown size';
    return [
      description,
      `Photo: ${imageUrl}`,
      `Page: ${pageUrl}`,
      `Photographer: ${photographer}`,
      `Likes: ${photo.likes ?? 0} | Size: ${size}`,
    ].join('\n   ');
  });

  return formatList(`Unsplash photos: ${query}`, rows);
}

export function createUnsplashToolHandlers({ rootDirectory }) {
  return {
    unsplash_search_photos(params = {}) {
      return unsplashSearchPhotos(rootDirectory, params);
    },
  };
}
