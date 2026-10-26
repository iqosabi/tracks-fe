import { test, expect } from '@playwright/test';
import examples from '../fixtures/api-response-examples.json' with { type: 'json' };
import { record } from '../../src/shared/data/guards';
import { items } from '../../src/shared/data/records';

test('uploaded response examples render every read module; loading, bus markers, zoom and focus work', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-25T02:59:59.000Z'));
  const errors: string[] = [],
    calls: string[] = [],
    tileZooms: number[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let releaseSummary: () => void = () => {};
  const summaryGate = new Promise<void>((resolve) => {
    releaseSummary = resolve;
  });
  await page.route('https://*.basemaps.cartocdn.com/**', (route) => {
    const match = new URL(route.request().url()).pathname.match(/(?:light|dark)_all\/(\d+)\//);
    if (match) tileZooms.push(Number(match[1]));
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="${route.request().url().includes('/dark_all/') ? '#101316' : '#f1f3f2'}"/><path d="M0 75h256M0 175h256M70 0v256M180 0v256" stroke="${route.request().url().includes('/dark_all/') ? '#263442' : '#fff'}" stroke-width="3"/></svg>`,
    });
  });
  await page.route('https://tracksmon-dev-api.aestaworks.com/**', async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method(),
      path = url.pathname;
    calls.push(method + ' ' + path + url.search);
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: {} });
    const entry = examples.endpoints.find(
      (e) =>
        e.method === method &&
        new RegExp('^' + e.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path),
    );
    if (!entry) throw Error('Unhandled example ' + method + ' ' + path);
    let body: unknown = structuredClone(entry.response.body);
    if (path.endsWith('/auth/login') || path.endsWith('/auth/me')) {
      const session = record(body);
      body = {
        ...session,
        user: { ...record(session.user), role: 'SUPER_ADMIN', operatorId: null },
      };
    }
    if (path.endsWith('/monitoring/summary')) await summaryGate;
    if (path.endsWith('/monitoring/vehicles')) {
      const current = Number(url.searchParams.get('page') ?? 1),
        root = record(body),
        bus = (items(body) ?? [])[0];
      body = {
        ...root,
        items: bus
          ? [
              {
                ...bus,
                deviceId: 'device-' + current,
                bodyNo: 'BUS-00' + current,
                latitude: current === 1 ? -6.1754 : -6.32,
                longitude: current === 1 ? 106.8272 : 106.91,
              },
            ]
          : [],
        page: current,
        limit: 1,
        hasMore: current === 1,
      };
    }
    if (entry.response.status === 204) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: entry.response.status, json: body });
  });
  await page.goto('/');
  await page.locator('[name=username]').fill('example');
  await page.locator('[name=password]').fill('synthetic');
  await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
  await expect(page.getByTestId('loading-popup')).toBeVisible();
  releaseSummary();
  await expect(page.locator('.live-stats')).toContainText('Total perangkat');
  await expect(page.locator('.live-stats')).toContainText('Batas offline1 Menit 30 Detik');
  await expect(page.getByTestId('loading-popup')).toHaveCount(0);
  const nav = async (id: string) => {
    const button = page.locator('.sidebar [data-page=' + id + ']');
    const group = button.locator('xpath=ancestor::details');
    if ((await group.count()) && !(await group.evaluate((el) => (el as HTMLDetailsElement).open)))
      await group.locator('summary').click();
    await button.click();
  };
  const checks: [string, string][] = [
    ['fleet', '36 KM/J'],
    ['alerts', 'Terlambat'],
    ['operatorSummary', 'AMJ'],
    ['buses', 'BUS-001'],
    ['routes', 'Terminal A - Terminal B'],
    ['devices', 'OBU BUS-001'],
    ['tickets', 'Bus membutuhkan bantuan teknis'],
    ['users', 'operator1'],
    ['audit', 'admin'],
  ];
  for (const [id, text] of checks) {
    await nav(id);
    await expect(page.locator('.content tbody')).toContainText(text);
  }
  await nav('usage');
  await expect(page.locator('.content tbody')).toContainText('100 MB');
  await expect(page.locator('.content tbody')).toContainText('25 Okt 2026');
  await page.getByRole('button', { name: 'Akumulasi perangkat' }).click();
  await expect(page.locator('.content thead')).toContainText('Jumlah laporan');
  await expect(page.locator('.content tbody')).toContainText('50 MB');
  expect(
    calls
      .filter((path) => path.includes('/monitoring/usage/summary'))
      .every((path) => !path.includes('page=') && !path.includes('limit=')),
  ).toBe(true);
  await nav('history');
  await page.locator('[name=deviceId]').selectOption('device-example-001');
  await page.getByRole('button', { name: 'Terapkan filter' }).click();
  await expect(page.locator('.content tbody')).toContainText('09:59:58.000 WIB');
  await nav('health');
  await expect(page.locator('.health-grid')).toContainText('Terhubung');
  await nav('account');
  await expect(page.locator('.account-profile')).toContainText('operator1');
  await nav('map');
  await expect(page.locator('.fleet-map-marker')).toHaveCount(2);
  await expect(page.locator('.bus-marker-icon')).toHaveCount(2);
  await expect(page.locator('.reference-map')).toHaveClass(/map-theme-dark/);
  const symbol = page.locator('.fleet-map-marker[title=BUS-002] .bus-marker-symbol');
  const initialSymbolSize = await symbol.evaluate((el) => el.getBoundingClientRect().width);
  await page.getByRole('combobox', { name: 'Operator di peta' }).selectOption('AMJ');
  await page.getByRole('combobox', { name: 'Rute di peta' }).selectOption('R01');
  await expect(page.locator('.fleet-map-marker')).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Cari bus di peta' }).fill('BUS-002');
  await page.locator('.map-search-results').getByRole('button', { name: 'BUS-002' }).click();
  const card = page.locator('.floating-bus-card[data-selected=true]');
  await expect(card).toContainText('BUS-002');
  await expect(card).toContainText('09:59:58.000 WIB');
  await expect(card).toContainText('1 Detik');
  await expect(card).toContainText('36 KM/J');
  await expect.poll(() => Math.max(...tileZooms)).toBeGreaterThanOrEqual(16);
  const marker = page.locator('.fleet-map-marker[title=BUS-002]'),
    canvas = page.locator('.carto-canvas');
  const markerBox = await marker.boundingBox(),
    canvasBox = await canvas.boundingBox();
  expect(markerBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  if (markerBox && canvasBox)
    expect(
      Math.abs(markerBox.x + markerBox.width / 2 - (canvasBox.x + canvasBox.width / 2)),
    ).toBeLessThan(6);
  await expect
    .poll(async () => symbol.evaluate((el) => el.getBoundingClientRect().width))
    .toBeGreaterThan(initialSymbolSize);
  const sizeBeforeZoom = await symbol.evaluate((el) => el.getBoundingClientRect().width);
  const previous = Math.max(...tileZooms);
  await page.locator('.leaflet-control-zoom-in').click();
  await expect.poll(() => Math.max(...tileZooms)).toBeGreaterThan(previous);
  await expect
    .poll(async () => symbol.evaluate((el) => el.getBoundingClientRect().width))
    .toBeGreaterThan(sizeBeforeZoom);
  const next = Math.max(...tileZooms);
  if (canvasBox) {
    await page.mouse.move(canvasBox.x + 120, canvasBox.y + 200);
    await page.mouse.wheel(0, -400);
  }
  await expect.poll(() => Math.max(...tileZooms)).toBeGreaterThan(next);
  await page.getByRole('button', { name: 'Tampilkan semua kendaraan' }).click();
  await page.getByRole('searchbox', { name: 'Cari bus di peta' }).fill('BUS-002');
  await page.locator('.map-search-results').getByRole('button', { name: 'BUS-002' }).click();
  await expect
    .poll(async () => {
      const selectedBox = await marker.boundingBox(),
        mapBox = await canvas.boundingBox();
      return selectedBox && mapBox
        ? Math.abs(selectedBox.x + selectedBox.width / 2 - (mapBox.x + mapBox.width / 2))
        : Infinity;
    })
    .toBeLessThan(6);
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('.reference-map')).toHaveClass(/map-theme-light/);
  await expect(card).toContainText('BUS-002');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('.reference-map')).toHaveClass(/map-theme-dark/);
  await page.getByRole('combobox', { name: 'Status di peta' }).selectOption('OFFLINE');
  await expect(page.locator('.fleet-map-marker')).toHaveCount(0);
  await expect(page.locator('.floating-bus-card')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Status di peta' }).selectOption('');
  await expect(page.locator('.fleet-map-marker')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('response-map-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('searchbox', { name: 'Cari bus di peta' }).fill('BUS-002');
  await page.locator('.map-search-results').getByRole('button', { name: 'BUS-002' }).click();
  await expect
    .poll(async () => {
      const busBox = await marker.boundingBox(),
        detailBox = await card.boundingBox();
      return !!busBox && !!detailBox && busBox.y + busBox.height < detailBox.y;
    })
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('response-map-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
