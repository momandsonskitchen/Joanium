import {
  buildUrl,
  clampInteger,
  formatList,
  requireConnectorCredentials,
  requireText,
} from '../../../Core/ConnectorHttp.js';

const SPOTIFY_API = 'https://api.spotify.com/v1';

async function spotifyRequest(rootDirectory, path, { searchParams = {} } = {}) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'spotify',
    ['accessToken'],
    'Spotify',
  );
  const response = await fetch(buildUrl(SPOTIFY_API, path, searchParams), {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.accessToken}`,
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      `${response.status} ${response.statusText}: ${data?.error?.message ?? 'Spotify request failed'}`,
    );
  return data;
}

function timeRange(value) {
  const range = String(value ?? 'medium_term').trim();
  return ['short_term', 'medium_term', 'long_term'].includes(range) ? range : 'medium_term';
}

function trackLabel(track, index = null) {
  return `${index == null ? '' : `${index + 1}. `}${track.name} - ${(track.artists ?? []).map((artist) => artist.name).join(', ')}\n   Album: ${track.album?.name ?? 'unknown'} | URL: ${track.external_urls?.spotify ?? ''}`;
}

export function createSpotifyToolHandlers({ rootDirectory }) {
  return {
    async spotify_get_profile() {
      const profile = await spotifyRequest(rootDirectory, '/me');
      return [
        `Spotify profile: ${profile.display_name || profile.id}`,
        `Email: ${profile.email ?? '(hidden)'}`,
        `Country: ${profile.country ?? 'unknown'}`,
        `Followers: ${profile.followers?.total ?? 0}`,
      ].join('\n');
    },

    async spotify_now_playing() {
      const data = await spotifyRequest(rootDirectory, '/me/player/currently-playing');
      if (!data?.item) return 'Nothing is currently playing on Spotify.';
      return [
        `Now playing`,
        trackLabel(data.item),
        `Progress: ${Math.round((data.progress_ms ?? 0) / 1000)}s`,
        `Playing: ${data.is_playing}`,
      ].join('\n');
    },

    async spotify_top_tracks(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await spotifyRequest(rootDirectory, '/me/top/tracks', {
        searchParams: { limit, time_range: timeRange(params.time_range ?? params.timeRange) },
      });
      return formatList('Spotify top tracks', (data.items ?? []).map(trackLabel));
    },

    async spotify_top_artists(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await spotifyRequest(rootDirectory, '/me/top/artists', {
        searchParams: { limit, time_range: timeRange(params.time_range ?? params.timeRange) },
      });
      return formatList(
        'Spotify top artists',
        (data.items ?? []).map(
          (artist, index) =>
            `${index + 1}. ${artist.name}\n   Genres: ${(artist.genres ?? []).join(', ') || 'n/a'} | Followers: ${artist.followers?.total ?? 0}\n   ${artist.external_urls?.spotify ?? ''}`,
        ),
      );
    },

    async spotify_list_playlists(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await spotifyRequest(rootDirectory, '/me/playlists', {
        searchParams: { limit },
      });
      return formatList(
        'Spotify playlists',
        (data.items ?? []).map(
          (playlist, index) =>
            `${index + 1}. ${playlist.name}\n   Tracks: ${playlist.tracks?.total ?? 0} | Public: ${playlist.public ?? false}\n   ID: ${playlist.id}`,
        ),
      );
    },

    async spotify_playlist_tracks(params = {}) {
      const playlistId = encodeURIComponent(
        requireText(params.playlist_id ?? params.playlistId, 'playlist_id'),
      );
      const limit = clampInteger(params.limit, 20, 1, 50);
      const data = await spotifyRequest(rootDirectory, `/playlists/${playlistId}/tracks`, {
        searchParams: { limit },
      });
      return formatList(
        'Spotify playlist tracks',
        (data.items ?? []).map((item, index) => trackLabel(item.track, index)),
      );
    },
  };
}
