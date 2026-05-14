/**
 * Maps a raw Spotify artist object to a clean shape.
 * @param {object} a - Raw artist from the Spotify API.
 */
export function mapArtist(a) {
  return {
    name: a.name,
    genres: a.genres ?? [],
    popularity: a.popularity,
    followers: a.followers?.total ?? 0,
    imageUrl: a.images?.[0]?.url ?? null,
    artistId: a.id,
  };
}

/**
 * Maps a raw Spotify playlist object to a clean shape.
 * @param {object} p - Raw playlist from the Spotify API.
 */
export function mapPlaylist(p) {
  return {
    name: p.name,
    description: p.description ?? '',
    owner: p.owner?.display_name ?? '',
    totalTracks: p.tracks?.total ?? 0,
    playlistId: p.id,
    imageUrl: p.images?.[0]?.url ?? null,
  };
}
