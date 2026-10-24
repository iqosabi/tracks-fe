import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const root = await realpath(resolve('dist'));
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT tidak valid.');
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const api = new URL(process.env.API_BASE_URL ?? 'https://tracksmon-dev-api.aestaworks.com/api/v1');
const allowedApi =
  api.protocol === 'https:' ||
  (api.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname));
if (!allowedApi || api.username || api.password || api.hash || api.search)
  throw new Error('API_BASE_URL tidak valid.');
const policy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*.basemaps.cartocdn.com",
  `connect-src 'self' ${api.origin}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', policy);
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const resolved = await realpath(file);
    if (!resolved.startsWith(root + sep) || !contentTypes[extname(resolved)]) {
      response.writeHead(404).end('Not found');
      return;
    }
    let body: string | Buffer = await readFile(resolved);
    if (
      pathname === '/runtime-config.js' &&
      (process.env.API_BASE_URL || process.env.CARTO_API_KEY)
    ) {
      const key = process.env.CARTO_API_KEY ?? '';
      body =
        'window.TRACKS_PUBLIC_CONFIG = ' +
        JSON.stringify({
          apiBaseUrl: api.href.replace(/\/+$/, ''),
          cartoApiKey: /^cb1_[A-Za-z0-9_-]+$/.test(key) ? key : '',
        }) +
        ';\n';
    }
    response.setHeader('Content-Type', contentTypes[extname(resolved)]!);
    response.setHeader(
      'Cache-Control',
      pathname.startsWith('/assets/') && /-[\w-]{8,}\./.test(pathname)
        ? 'public, max-age=31536000, immutable'
        : 'no-store',
    );
    response.writeHead(200).end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(port, '0.0.0.0', () => console.log(`AMJ production build listening on port ${port}`));
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => server.close());
