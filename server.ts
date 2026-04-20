import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser(process.env.COOKIE_SECRET || 'gitscribe-secret'));

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const APP_URL = process.env.APP_URL;
  const useSecureCookie = APP_URL?.startsWith('https://') || process.env.NODE_ENV === 'production';

  // --- Auth Routes ---

  app.get('/api/auth/url', (req, res) => {
    if (!GITHUB_CLIENT_ID) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
    }
    const redirectUri = `${APP_URL}/auth/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'repo,user',
      state: Math.random().toString(36).substring(7),
    });
    const authUrl = `https://github.com/login/oauth/authorize?${params}`;
    res.json({ url: authUrl });
  });

  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        })
      });

      const data = await response.json() as any;
      const accessToken = data.access_token;
      if (!accessToken) {
        throw new Error('No access token received');
      }

      res.cookie('gh_token', accessToken, {
        secure: useSecureCookie,
        sameSite: useSecureCookie ? 'none' : 'lax',
        httpOnly: true,
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. Closing window...</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    const token = req.cookies.gh_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('gh_token', {
      secure: useSecureCookie,
      sameSite: useSecureCookie ? 'none' : 'lax',
      httpOnly: true,
    });
    res.json({ ok: true });
  });

  app.all('/api/github/*', async (req, res) => {
    const token = req.cookies.gh_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const githubPath = req.params[0];
    const method = req.method;

    try {
      const query = new URLSearchParams(req.query as any).toString();
      const url = `https://api.github.com/${githubPath}${query ? `?${query}` : ''}`;
      
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      };

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json'
        };
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (error: any) {
      console.error('Github API error:', error.message);
      res.status(500).json({ error: 'Github request failed' });
    }
  });

  // --- Vite / Static ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CMS running at http://localhost:${PORT}`);
  });
}

startServer();
