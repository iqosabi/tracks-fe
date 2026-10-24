import { test, type BrowserContext } from '@playwright/test';
import assert from 'node:assert/strict';
test('sidebar, data tables, filters, record actions and CARTO configuration', async ({
  browser,
}) => {
  const ownedContexts: BrowserContext[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
      calls: string[] = [],
      errors: string[] = [];
    let tileRequests = 0;
    ownedContexts.push(context);
    await context.route('**/runtime-config.js', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'window.TRACKS_PUBLIC_CONFIG={cartoApiKey:"cb1_synthetic_only"};',
      }),
    );
    await context.route('https://*.basemaps.cartocdn.com/**', (r) => {
      assert.equal(new URL(r.request().url()).searchParams.get('key'), 'cb1_synthetic_only');
      tileRequests++;
      return r.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f1f2f0"/><path d="M0 80h256M0 170h256M70 0v256M180 0v256" stroke="white" stroke-width="8"/></svg>',
      });
    });
    const users = Array.from({ length: 36 }, (_, i) => ({
      id: 'u' + i,
      username: 'user-' + String(i + 1).padStart(2, '0'),
      role: 'OPERATOR_VIEWER',
      operatorId: 'operator1',
      active: true,
    }));
    const cars = Array.from({ length: 61 }, (_, i) => ({
      id: 'd' + i,
      bodyNo: 'BUS-' + String(i + 1).padStart(3, '0'),
      status: 'ACTIVE',
      latitude: -6.2 + i * 0.0001,
      longitude: 106.8 + i * 0.0001,
    }));
    await context.route('https://tracksmon-dev-api.aestaworks.com/**', async (r) => {
      const u = new URL(r.request().url()),
        p = u.pathname;
      calls.push(p + u.search);
      if (p.endsWith('/auth/refresh')) return r.fulfill({ status: 401, json: {} });
      if (p.endsWith('/auth/login'))
        return r.fulfill({
          status: 201,
          json: {
            accessToken: 'synthetic',
            tokenType: 'Bearer',
            expiresIn: 900,
            user: { id: 'admin', username: 'admin', role: 'SUPER_ADMIN', operatorId: null },
            refreshExpiresAt: '2026-10-30T00:00:00Z',
          },
        });
      if (p.endsWith('/monitoring/summary'))
        return r.fulfill({ json: { total: 61, active: 61, idle: 0, delayed: 0, offline: 0 } });
      if (p.endsWith('/monitoring/alerts'))
        return r.fulfill({
          json: { items: cars.slice(0, 32).map((c) => ({ ...c, type: 'OFFLINE' })) },
        });
      if (p.endsWith('/monitoring/vehicles')) {
        const q = u.searchParams.get('q') || '',
          limit = Number(u.searchParams.get('limit') || 25),
          page = Number(u.searchParams.get('page') || 1),
          filtered = cars.filter((c) => c.bodyNo.includes(q));
        return r.fulfill({
          json: {
            items: filtered.slice((page - 1) * limit, page * limit),
            pagination: {
              total: filtered.length,
              totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
            },
          },
        });
      }
      if (p.endsWith('/cms/users')) return r.fulfill({ json: users });
      if (p.includes('/cms/users/') && r.request().method() === 'PATCH')
        return r.fulfill({ json: { ok: true } });
      if (p.endsWith('/cms/buses'))
        return r.fulfill({ json: { items: [{ id: 'bus1', bodyNo: 'Bus one' }] } });
      if (p.endsWith('/cms/operators'))
        return r.fulfill({ json: { items: [{ id: 'operator1', name: 'Operator one' }] } });
      if (p.endsWith('/cms/devices'))
        return r.fulfill({ json: { items: [{ id: 'device1', label: 'Device one' }] } });
      if (p.includes('/monitoring/usage'))
        return r.fulfill({
          json: {
            items: [{ label: 'Device one', totalBytes: '33933' }],
            pagination: { total: 1, totalPages: 1 },
          },
        });
      return r.fulfill({ status: 200, json: { items: [] } });
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173');
    await page.getByRole('button', { name: 'Masuk ke workspace' }).waitFor();
    await page.locator('[name=username]').fill('synthetic');
    await page.locator('[name=password]').fill('synthetic');
    await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
    await page.locator('.live-stats').waitFor();
    const group = page.locator('[data-nav-group=monitoring]');
    await group.locator('summary').click();
    assert.equal(await group.locator('[data-page=fleet]').isVisible(), false);
    await group.locator('summary').click();
    await page.locator('#sidebar-close').click();
    assert.ok(
      await page.locator('.workspace').evaluate((e) => e.classList.contains('sidebar-collapsed')),
    );
    assert.equal(await page.locator('.header-brand').isVisible(), true);
    assert.equal(
      await page.locator('.main').evaluate((e) => Math.round(e.getBoundingClientRect().left)),
      0,
    );
    await page.locator('#menu').click();
    assert.equal(await page.locator('.sidebar').isVisible(), true);
    await page.locator('.sidebar [data-page=fleet]').click();
    const fleet = page.locator('#vehicles-body');
    await fleet.getByRole('cell', { name: 'BUS-001', exact: true }).waitFor();
    assert.equal(await fleet.locator('tbody tr').count(), 25);
    assert.equal(
      (await fleet.locator('tbody tr').first().locator('td').first().innerText()).trim(),
      '1',
    );
    await fleet.getByRole('button', { name: 'Halaman 2', exact: true }).click();
    await fleet.getByRole('cell', { name: 'BUS-026', exact: true }).waitFor();
    assert.equal(
      (await fleet.locator('tbody tr').first().locator('td').first().innerText()).trim(),
      '26',
    );
    assert.ok(calls.some((c) => c.includes('page=2&limit=25')));
    await fleet.getByRole('searchbox', { name: 'Cari data' }).fill('BUS-061');
    await fleet.getByRole('cell', { name: 'BUS-061', exact: true }).waitFor();
    assert.equal(await fleet.locator('tbody tr').count(), 1);
    assert.ok(calls.some((c) => c.includes('q=BUS-061')));
    await fleet.getByRole('searchbox', { name: 'Cari data' }).fill('');
    await fleet.getByRole('cell', { name: 'BUS-001', exact: true }).waitFor();
    await fleet.getByRole('combobox', { name: 'Baris per halaman' }).selectOption('10');
    await page.waitForFunction(
      () => document.querySelector('#vehicles-body tbody')?.children.length === 10,
    );
    await fleet.getByRole('button', { name: 'Halaman 2', exact: true }).click();
    await fleet.getByRole('cell', { name: 'BUS-011', exact: true }).waitFor();
    await page.locator('.sidebar [data-page=alerts]').click();
    const alerts = page.locator('#alerts-body');
    await alerts.getByRole('button', { name: 'Halaman 2', exact: true }).click();
    assert.equal(
      (await alerts.locator('tbody tr').first().locator('td').first().innerText()).trim(),
      '26',
    );
    await alerts.getByRole('searchbox', { name: 'Cari data' }).fill('BUS-032');
    assert.equal(await alerts.locator('tbody tr').count(), 1);
    assert.equal(
      (await alerts.locator('tbody tr').first().locator('td').first().innerText()).trim(),
      '1',
    );
    await page.locator('[data-nav-group=administration]>summary').click();
    await page.locator('.sidebar [data-page=users]').click();
    const userTable = page.locator('#module-data');
    await userTable.getByRole('cell', { name: 'user-01', exact: true }).waitFor();
    await userTable.getByRole('button', { name: 'Halaman 2', exact: true }).click();
    assert.equal(
      (await userTable.locator('tbody tr').first().locator('td').first().innerText()).trim(),
      '26',
    );
    await userTable.getByRole('searchbox', { name: 'Cari data' }).fill('user-36');
    await userTable.getByRole('button', { name: 'Ubah', exact: true }).click();
    assert.equal(
      await page.locator('.management-dialog [name=role]').inputValue(),
      'OPERATOR_VIEWER',
    );
    await page.locator('.management-dialog [name=active]').selectOption('false');
    await page.locator('.management-dialog [type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('.management-dialog'));
    assert.ok(calls.some((c) => c === '/api/v1/cms/users/u35'));
    assert.ok(!calls.some((c) => c.startsWith('/api/v1/cms/users?')));
    const action = await page
      .locator('[data-action=edit]')
      .first()
      .evaluate((e) => ({
        width: getComputedStyle(e).borderTopWidth,
        style: getComputedStyle(e).borderTopStyle,
      }));
    assert.notEqual(action.width, '0px');
    assert.equal(action.style, 'solid');
    await page.locator('.sidebar [data-page=usage]').click();
    await page.getByRole('cell', { name: '33,14 KB', exact: true }).waitFor();
    const filter = page.locator('#module-filter');
    const sizes = await filter
      .locator('.field>select,.field>input')
      .evaluateAll((es) => es.map((e) => Math.round(e.getBoundingClientRect().height)));
    assert.ok(sizes.every((h) => h === 41));
    assert.ok(await filter.locator('#module-reset').isVisible());
    await page.locator('.sidebar [data-page=map]').click();
    await page.locator('.fleet-map-marker').first().waitFor();
    await page.locator('.fleet-map-marker').last().focus();
    await page.locator('.fleet-map-marker').last().press('Enter');
    await page.locator('.map-popup').waitFor();
    assert.ok((await page.locator('.map-popup').innerText()).includes('Beroperasi'));
    assert.ok(tileRequests > 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#menu').click();
    await page.waitForFunction(
      () => (document.querySelector('.sidebar')?.getBoundingClientRect().left ?? -1) >= 0,
    );
    assert.equal(
      await page.locator('.sidebar').evaluate((e) => e.getBoundingClientRect().left >= 0),
      true,
    );
    await page.locator('.sidebar [data-page=usage]').click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.locator('#menu').click();
    await page.locator('#sidebar-backdrop').click({ position: { x: 360, y: 500 } });
    assert.ok(
      !((await page.locator('.workspace').getAttribute('class')) ?? '').includes('menu-open'),
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        sidebarGroups: true,
        desktopCollapse: true,
        serverSearchAndPagination: true,
        continuousNumbering: true,
        localPaginationAndSearch: true,
        filteredActionsUseCorrectRecord: true,
        borderedActions: true,
        alignedFilters: true,
        mobile: true,
        cartoKeyAttached: true,
        translatedMapPopup: true,
        pageErrors: errors,
      }),
    );
    await context.close();
  } finally {
    await Promise.allSettled(ownedContexts.map((context) => context.close()));
  }
});
