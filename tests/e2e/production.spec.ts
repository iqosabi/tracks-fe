import { test, expect } from '@playwright/test';

test('production server serves build assets with headers and hides source files', async ({
  request,
}) => {
  const home = await request.get('/');
  expect(home.status()).toBe(200);
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['x-frame-options']).toBe('DENY');
  expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(home.headers()['cache-control']).toBe('no-store');
  const index = await home.text();
  const asset = index.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];
  expect(asset).toBeTruthy();
  if (!asset) throw new Error('Production bundle not found');
  const bundle = await request.get(asset);
  expect(bundle.status()).toBe(200);
  expect(bundle.headers()['cache-control']).toContain('immutable');
  const config = await request.get('/runtime-config.js');
  expect(config.headers()['cache-control']).toBe('no-store');
  // Assert only a boolean so a failed configuration test cannot print a real key.
  expect((await config.text()).includes('cb1_e2e_config')).toBe(true);
  for (const path of ['/src/main.ts', '/package.json', '/.env.local', '/.git/config']) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const denied = await request.post('/');
  expect(denied.status()).toBe(405);
  expect(denied.headers()['allow']).toBe('GET, HEAD');
  expect(await (await request.head('/')).text()).toBe('');
});
