/**
 * Maps a raw Supabase storage bucket to a clean shape.
 * @param {object} b - Raw bucket from the Supabase Management API.
 */
export function mapBucket(b) {
  return {
    id: b.id,
    name: b.name,
    public: b.public,
    fileSizeLimit: b.file_size_limit ?? null,
    allowedMimeTypes: b.allowed_mime_types ?? null,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}
