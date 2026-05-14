/**
 * Maps a raw Netlify deploy object to a clean shape.
 * @param {object} d - Raw deploy from the Netlify API.
 */
export function mapDeploy(d) {
  return {
    id: d.id,
    state: d.state,
    branch: d.branch,
    commitRef: d.commit_ref ?? null,
    commitUrl: d.commit_url ?? null,
    createdAt: d.created_at,
    errorMessage: d.error_message ?? null,
  };
}
