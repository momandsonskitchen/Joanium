import { shell } from 'electron';
import http from 'node:http';

const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/youtube.force-ssl',
].join(' ');

function startCallbackServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });

    server.on('error', reject);
  });
}

function waitForCode(server) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error('Google sign-in timed out. Please try again.'));
      },
      5 * 60 * 1000,
    ); // 5 min

    server.on('request', (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      // Respond with a close-tab page before resolving/rejecting
      const html = code
        ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Connected</title>
           <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f6f8fa}
           .box{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 16px #0001}
           h2{margin:0 0 .5rem;color:#1a1a1a}p{color:#555;margin:0}</style></head>
           <body><div class="box"><h2>✓ Google connected</h2><p>You can close this tab and return to Joanium.</p></div></body></html>`
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title>
           <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f6f8fa}
           .box{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 16px #0001}
           h2{margin:0 0 .5rem;color:#c00}p{color:#555;margin:0}</style></head>
           <body><div class="box"><h2>Sign-in failed</h2><p>${error ?? 'Unknown error'}. You can close this tab.</p></div></body></html>`;

      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);

      clearTimeout(timeout);
      server.close();

      if (code) {
        resolve(code);
      } else {
        reject(new Error(`Google OAuth error: ${error ?? 'no code returned'}`));
      }
    });
  });
}

export async function startGoogleOAuthFlow({ clientId, clientSecret }) {
  const { server, port } = await startCallbackServer();
  const redirectUri = `http://127.0.0.1:${port}`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent'); // always return refresh_token

  await shell.openExternal(authUrl.toString());

  const code = await waitForCode(server);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.refresh_token) {
    throw new Error(
      data?.error_description ??
        data?.error ??
        'Token exchange failed — ensure the app type is Desktop in Google Cloud Console.',
    );
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}
