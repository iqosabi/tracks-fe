import { test, expect } from '@playwright/test';
import { tmsFixtures, tmsLoginFixture } from '../fixtures/tms';

test('legacy workspace consumes captured modules and isolates CMS session', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [],
    calls: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let forbidden = false,
    loginAttempts = 0;
  let releaseLive: () => void = () => {};
  const liveGate = new Promise<void>((resolve) => {
    releaseLive = resolve;
  });
  await page.route('https://*.basemaps.cartocdn.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#101316"/></svg>',
    }),
  );
  await page.route('https://tracksmon-dev-api.aestaworks.com/**', (route) => {
    calls.push('CMS ' + route.request().method());
    return route.fulfill({ status: 401, json: {} });
  });
  await page.route('https://api-tms.aestaworks.com/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace(/^\/api/, '');
    calls.push(route.request().method() + ' ' + path);
    if (path === '/auth/login') {
      loginAttempts++;
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({
        email: 'operator@example.test',
        password: 'synthetic-password!',
      });
      expect(route.request().headers().authorization).toBeUndefined();
      return route.fulfill(
        loginAttempts === 1
          ? { status: 401, json: { success: false } }
          : { json: { success: true, metadata: {}, data: tmsLoginFixture } },
      );
    }
    expect(route.request().headers().authorization).toBe('Bearer local-test');
    expect(route.request().headers().cookie).toBeUndefined();
    if (forbidden && path === '/menus') return route.fulfill({ status: 403, json: {} });
    if (!(path in tmsFixtures)) throw Error('Unexpected TMS path: ' + path);
    if (path === '/fleets/live-status') await liveGate;
    return route.fulfill({
      json: { success: true, metadata: { message: 'synthetic' }, data: tmsFixtures[path] },
    });
  });
  const old = await request.get('/old');
  expect(old.status()).toBe(200);
  expect(old.headers()['content-security-policy']).toContain('https://api-tms.aestaworks.com');
  expect((await request.get('/old/')).status()).toBe(200);
  await page.goto('/old');
  await expect(page.getByRole('heading', { name: 'Masuk ke TMS' })).toBeVisible();
  expect(calls).toEqual([]);
  await expect(page.locator('[name=accessToken]')).toHaveCount(0);
  await expect(page.locator('[name=email]')).toHaveValue('');
  await page.locator('[name=email]').fill('operator@example.test');
  await page.locator('[name=password]').fill('synthetic-password!');
  await page.getByRole('button', { name: 'Tampilkan password' }).click();
  await expect(page.locator('[name=password]')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Sembunyikan password' }).click();
  await page.getByRole('button', { name: 'Masuk ke TMS', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Email atau password tidak valid');
  await expect(page.locator('.legacy-workspace')).toHaveCount(0);
  await page.getByRole('button', { name: 'Masuk ke TMS', exact: true }).click();
  await expect(page.getByTestId('loading-popup')).toBeVisible();
  releaseLive();
  await expect(page.getByRole('heading', { name: 'Data bus', exact: true })).toBeVisible();
  await expect(page.locator('.legacy-header')).toContainText('Pengguna contoh');
  await expect(page.locator('[name=password]')).toHaveCount(0);
  await expect(page.getByTestId('loading-popup')).toHaveCount(0);
  const buses = page.locator('.legacy-table').last();
  await expect(buses.locator('tbody tr')).toHaveCount(10);
  await buses.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(buses.locator('tbody tr').first().locator('td').first()).toHaveText('11');
  await buses.getByRole('searchbox').fill('BUS-024');
  await expect(buses.locator('tbody tr')).toHaveCount(1);
  await expect(buses.locator('tbody')).toContainText('08:02:03.123 WIB');
  await expect(page.locator('body')).not.toContainText('SHOULD_NEVER_RENDER');
  await expect(page.locator('body')).not.toContainText('PRIVATE_DEVICE_ID');
  const checks = [
    ['Master armada', 'FLEET-001'],
    ['Halte', 'Halte contoh'],
    ['Koridor', 'Koridor contoh'],
    ['Ringkasan tenant', 'Tenant contoh'],
    ['Tenant', 'Alamat contoh'],
    ['Menu akses saya', 'Operasional contoh'],
    ['Daftar menu', 'Operasional contoh'],
  ];
  for (const [module, text] of checks) {
    await page
      .getByRole('navigation', { name: 'Modul TMS' })
      .getByRole('button', { name: module, exact: true })
      .click();
    await expect(page.locator('.legacy-main tbody')).toContainText(text);
  }
  forbidden = true;
  await page.getByRole('button', { name: 'Muat ulang' }).click();
  await expect(page.getByRole('alert')).toContainText('tidak memiliki akses');
  await expect(page.locator('.legacy-main tbody')).toHaveCount(0);
  await page.getByRole('button', { name: 'Peta armada', exact: true }).click();
  await expect(page.locator('.fleet-map-marker')).toHaveCount(24);
  await page.getByRole('searchbox', { name: 'Cari bus TMS' }).fill('BUS-024');
  await page.locator('.map-search-results').getByRole('button', { name: 'BUS-024' }).click();
  await expect(page.locator('.floating-bus-card')).toContainText('BUS-024');
  await expect(page.locator('.floating-bus-card')).toContainText('1 Detik');
  await expect(page.locator('.floating-bus-card')).toContainText('24 km/j');
  const marker = page.locator('.fleet-map-marker[title=BUS-024] .bus-marker-symbol');
  const before = await marker.evaluate((el) => el.getBoundingClientRect().width);
  await page.locator('.leaflet-control-zoom-in').click();
  await expect
    .poll(() => marker.evaluate((el) => el.getBoundingClientRect().width))
    .toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('.legacy-map')).toHaveClass(/map-theme-light/);
  await page.screenshot({ path: testInfo.outputPath('legacy-desktop.png') });
  await page.getByRole('button', { name: 'Tutup sidebar TMS' }).click();
  await expect(page.getByRole('navigation', { name: 'Modul TMS' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('searchbox', { name: 'Cari bus TMS' }).fill('BUS-024');
  await page.locator('.map-search-results').getByRole('button', { name: 'BUS-024' }).click();
  await page.screenshot({ path: testInfo.outputPath('legacy-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page.evaluate(() => [
      localStorage.getItem('accessToken'),
      sessionStorage.getItem('accessToken'),
    ]),
  ).toEqual([null, null]);
  expect(calls.some((call) => call.startsWith('CMS'))).toBe(false);
  expect(calls.filter((call) => call.startsWith('GET ')).map((call) => call.slice(4))).toEqual(
    expect.arrayContaining(Object.keys(tmsFixtures)),
  );
  await page.getByRole('button', { name: 'Buka sidebar TMS' }).click();
  await page.getByRole('button', { name: 'Keluar dari TMS' }).click();
  await expect(page.getByRole('heading', { name: 'Masuk ke TMS' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Masuk ke workspace' })).toBeVisible();
  expect(errors).toEqual([]);
});
