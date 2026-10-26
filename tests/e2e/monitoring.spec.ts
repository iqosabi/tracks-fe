import { test, expect } from '@playwright/test';
test('role-scoped card overview and conditional bus overlays on the full map', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T06:01:14.678Z'));
  const calls: string[] = [];
  let overspeed = false;
  const busTime = '2026-10-24T06:01:12.345Z';
  await page.route('https://*.basemaps.cartocdn.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }),
  );
  await page.route('https://tracksmon-dev-api.aestaworks.com/**', (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    calls.push(path);
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: {} });
    if (path.endsWith('/auth/login'))
      return route.fulfill({
        json: {
          accessToken: 'mock',
          tokenType: 'Bearer',
          expiresIn: 900,
          refreshExpiresAt: '2026-10-30T00:00:00Z',
          user: {
            id: 'viewer',
            username: 'viewer',
            role: 'OPERATOR_VIEWER',
            operatorId: 'operator-1',
          },
        },
      });
    if (path.endsWith('/monitoring/summary'))
      return route.fulfill({ json: { total: 2, active: 2, idle: 0, delayed: 0, offline: 0 } });
    if (path.endsWith('/monitoring/vehicles'))
      return route.fulfill({
        json: {
          items: [
            {
              deviceId: 'bus-1',
              bodyNo: 'BUS-001',
              latitude: -6.2,
              longitude: 106.8,
              speedKph: 42,
              recordedAt: busTime,
              receivedAt: '2026-10-24T06:01:14.678Z',
            },
            {
              deviceId: 'bus-2',
              bodyNo: 'BUS-002',
              latitude: -6.21,
              longitude: 106.81,
              speedKph: 95,
              isOverspeed: overspeed,
              recordedAt: busTime,
              delayMs: 50,
            },
          ],
          pagination: { total: 2, totalPages: 1 },
        },
      });
    if (path.endsWith('/monitoring/alerts')) return route.fulfill({ json: { items: [] } });
    return route.fulfill({ json: { items: [], pagination: { total: 0, totalPages: 1 } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Masuk ke workspace' }).waitFor();
  await page.locator('[name=username]').fill('viewer');
  await page.locator('[name=password]').fill('synthetic');
  await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
  await expect(page.locator('.live-stats').first()).toBeVisible();
  await expect(page.locator('.overview-cards h2').first()).toContainText('Kondisi armada');
  await expect(page.locator('.content .leaflet-container')).toHaveCount(0);
  await expect(page.locator('.content table')).toHaveCount(0);
  expect(calls.some((path) => /\/cms\/(users|audit|operators)$/.test(path))).toBe(false);
  await page.locator('.sidebar [data-page=map]').click();
  await expect(page.locator('.fleet-map-marker')).toHaveCount(2);
  await expect(page.locator('.floating-bus-card')).toHaveCount(0);
  await expect(page.locator('.content table')).toHaveCount(0);
  expect(
    await page.locator('.fleet-full-map').evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThan(500);
  await page.locator('.fleet-map-marker[title=BUS-001]').click();
  const selected = page.locator('.floating-bus-card[data-selected=true]');
  await expect(selected).toBeVisible();
  for (const label of ['Bus', 'Lat', 'Lon', 'Time bus', 'Delay', 'Speed'])
    await expect(selected.locator('dt', { hasText: new RegExp(`^${label}$`) })).toBeVisible();
  await expect(selected).toContainText('13:01:12.345 WIB');
  await expect(selected).toContainText('2,33 Detik');
  await expect(selected).toContainText('42 KM/J');
  overspeed = true;
  await page.locator('.map-controls button', { hasText: 'Perbarui' }).click();
  await expect(page.locator('.floating-bus-card.overspeed')).toContainText('BUS-002');
  await expect(selected).toContainText('BUS-001');
  await selected.getByRole('button', { name: 'Tutup detail bus' }).click();
  await expect(page.locator('.floating-bus-card')).toHaveCount(1);
  overspeed = false;
  await page.locator('.map-controls button', { hasText: 'Perbarui' }).click();
  await expect(page.locator('.floating-bus-card')).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-10-24T06:02:45.678Z'));
  overspeed = true;
  await page.locator('.map-controls button', { hasText: 'Perbarui' }).click();
  await expect(page.locator('.map-point.offline')).toHaveCount(2);
  await expect(page.locator('.floating-bus-card.overspeed')).toHaveCount(0);
  await page.locator('.fleet-map-marker[title=BUS-001]').click();
  await expect(selected).toContainText('Nonaktif');
  await expect(selected).toContainText('1 Menit 33,33 Detik');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
