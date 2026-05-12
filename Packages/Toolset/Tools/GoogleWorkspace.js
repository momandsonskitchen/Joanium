const tokenCache = new Map();

function cacheKeyFor(credentials = {}) {
  return `${credentials.clientId ?? ''}:${credentials.refreshToken ?? ''}`;
}

export async function getFreshCreds(credentials = {}) {
  const clientId = String(credentials.clientId ?? '').trim();
  const clientSecret = String(credentials.clientSecret ?? '').trim();
  const refreshToken = String(credentials.refreshToken ?? '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Workspace is not configured in Settings > Connectors.');
  }

  const cacheKey = cacheKeyFor({ clientId, refreshToken });
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return { ...credentials, accessToken: cached.accessToken };
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(
      `Google token refresh failed: ${data?.error_description ?? data?.error ?? response.statusText}`,
    );
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000,
  });

  return { ...credentials, accessToken: data.access_token };
}
