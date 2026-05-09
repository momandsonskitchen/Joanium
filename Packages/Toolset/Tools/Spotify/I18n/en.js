const spotifyStrings = {
  connector: {
    id: 'spotify',
    label: 'Spotify',
    description: 'Profile, playback, top tracks/artists, playlists, and search through the Spotify Web API.',
    credentialKey: 'accessToken',
    optional: false,
    fields: [
      {
        key: 'accessToken',
        label: 'OAuth access token',
        placeholder: 'Spotify OAuth access token',
        type: 'password',
        required: true
      }
    ]
  },
  tools: [
    {
      name: 'spotify_get_profile',
      description: 'Get the authenticated Spotify profile.',
      category: 'spotify',
      parameters: {}
    },
    {
      name: 'spotify_now_playing',
      description: 'Get the currently playing Spotify track.',
      category: 'spotify',
      parameters: {}
    },
    {
      name: 'spotify_top_tracks',
      description: 'List top Spotify tracks for the authenticated user.',
      category: 'spotify',
      parameters: {
        time_range: { type: 'string', required: false, description: 'short_term, medium_term, or long_term. Defaults to medium_term.' },
        limit: { type: 'number', required: false, description: 'Maximum tracks, default 10, max 25.' }
      }
    },
    {
      name: 'spotify_top_artists',
      description: 'List top Spotify artists for the authenticated user.',
      category: 'spotify',
      parameters: {
        time_range: { type: 'string', required: false, description: 'short_term, medium_term, or long_term. Defaults to medium_term.' },
        limit: { type: 'number', required: false, description: 'Maximum artists, default 10, max 25.' }
      }
    },
    {
      name: 'spotify_list_playlists',
      description: 'List Spotify playlists for the authenticated user.',
      category: 'spotify',
      parameters: {
        limit: { type: 'number', required: false, description: 'Maximum playlists, default 10, max 25.' }
      }
    },
    {
      name: 'spotify_playlist_tracks',
      description: 'List tracks in a Spotify playlist.',
      category: 'spotify',
      parameters: {
        playlist_id: { type: 'string', required: true, description: 'Spotify playlist ID.' },
        limit: { type: 'number', required: false, description: 'Maximum tracks, default 20, max 50.' }
      }
    }
  ]
};

export default spotifyStrings;
