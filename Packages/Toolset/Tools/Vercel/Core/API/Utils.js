/**
 * Maps a raw Vercel deployment object to a clean shape.
 * @param {object} d - Raw deployment from the Vercel API.
 */
export function mapDeployment(d) {
  return {
    id: d.uid,
    name: d.name,
    url: d.url,
    state: d.state,
    createdAt: d.createdAt,
    target: d.target ?? 'preview',
  };
}
