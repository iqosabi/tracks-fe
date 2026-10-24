import type { ApiRecord } from '../../src/core/types';
import { record } from '../../src/shared/data/guards';
import { test, type BrowserContext } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('all 43 CMS endpoints remain reachable through their UI flows', async ({ browser }) => {
  const ownedContexts: BrowserContext[] = [];
  const calls: { path: string; method: string; query: string; body: unknown }[] = [];
  const errors: string[] = [];
  const bus = {
    id: 'bus-1',
    bodyNo: 'AMJ-001',
    plateNo: 'B 1234 AMJ',
    operator: 'AMJ',
    model: 'Hino',
    active: true,
  };
  const operator = {
    id: 'operator-1',
    code: 'AMJ',
    name: 'Ananda Makmur Jaya',
    busCount: 33933,
    deviceCount: 41,
    active: true,
  };
  const device = {
    id: 'device-1',
    busId: 'bus-1',
    label: 'OBU AMJ-001',
    sendIntervalMs: 10000,
    gpsListenMs: 1000,
    configPollIntervalSec: 60,
    active: true,
    tokenHash: 'hidden-secret-hash',
  };
  const route = { code: 'R/1', value: 'Blok M – Kota', active: true };
  const ticket = {
    id: 'ticket-1',
    bodyNo: 'AMJ-001',
    driverName: 'Budi',
    message: 'Membutuhkan bantuan',
    status: 'OPEN',
    createdAt: '2026-10-24T06:00:00Z',
  };
  const account = {
    id: 'user-1',
    username: 'operator.01',
    role: 'OPERATOR_VIEWER',
    operatorId: 'operator-1',
    operator: { name: operator.name },
    active: true,
  };
  const lists: Record<string, ApiRecord[]> = {
    operators: [operator],
    buses: [bus],
    routes: [route],
    devices: [device],
    'help-reports': [ticket],
    users: [account],
    audit: [
      {
        id: 'audit-1',
        username: 'admin',
        action: 'UPDATE',
        entityType: 'bus',
        createdAt: '2026-10-24T06:00:00Z',
      },
    ],
  };
  const tile =
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f1f2f0"/><path d="M0 75h256M0 170h256M80 0v256M190 0v256" stroke="white" stroke-width="8"/></svg>';
  async function setup(role = 'SUPER_ADMIN') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    ownedContexts.push(context);
    await context.route('**/runtime-config.js', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'window.TRACKS_PUBLIC_CONFIG={cartoApiKey:"cb1_browser_test"};',
      }),
    );
    await context.route('https://*.basemaps.cartocdn.com/**', (r) =>
      r.fulfill({ contentType: 'image/svg+xml', body: tile }),
    );
    await context.route('https://tracksmon-dev-api.aestaworks.com/**', async (r) => {
      const url = new URL(r.request().url()),
        path = url.pathname.replace('/api/v1', ''),
        method = r.request().method(),
        body = record(r.request().postDataJSON());
      calls.push({ path, method, query: url.search, body });
      if (path === '/auth/refresh') return r.fulfill({ status: 401, json: {} });
      if (path === '/auth/login')
        return r.fulfill({
          status: 201,
          json: {
            accessToken: 'mock-' + role,
            tokenType: 'Bearer',
            expiresIn: 900,
            refreshExpiresAt: '2026-10-30T00:00:00Z',
            user: {
              id: 'signed-in',
              username: role === 'SUPER_ADMIN' ? 'admin' : 'viewer',
              role,
              operatorId: role === 'SUPER_ADMIN' ? null : 'operator-1',
            },
          },
        });
      if (path === '/auth/me') return r.fulfill({ json: { user: { username: 'admin', role } } });
      if (path === '/auth/logout' || path === '/auth/logout-all')
        return r.fulfill({ status: 204, body: '' });
      if (path.startsWith('/health/')) return r.fulfill({ json: { status: 'ok' } });
      assert.equal(r.request().headers().authorization, 'Bearer mock-' + role);
      if (path === '/monitoring/summary')
        return r.fulfill({
          json: {
            total: 33933,
            active: 24,
            idle: 4,
            delayed: 2,
            offline: 1,
            configVersion: 991122,
          },
        });
      if (path === '/monitoring/operators/summary')
        return r.fulfill({
          json: {
            items: [
              {
                operatorName: operator.name,
                total: 33933,
                active: 24,
                idle: 4,
                delayed: 2,
                offline: 1,
              },
            ],
          },
        });
      if (path === '/monitoring/vehicles')
        return r.fulfill({
          json: {
            items: [
              {
                id: 'gps-1',
                deviceId: 'device-1',
                bus,
                status: 'ACTIVE',
                latitude: -6.2,
                longitude: 106.8,
                speedKph: 32,
                receivedAt: '2026-10-24T06:00:00Z',
                rawInternalKey: 'hidden-raw',
              },
            ],
            pagination: { totalPages: 1 },
          },
        });
      if (path === '/monitoring/alerts')
        return r.fulfill({
          json: {
            items: [{ bodyNo: bus.bodyNo, type: 'OFFLINE', lastSeenAt: '2026-10-24T06:00:00Z' }],
          },
        });
      if (path.includes('/history'))
        return r.fulfill({
          json: {
            items: [
              {
                latitude: -6.2,
                longitude: 106.8,
                speedKph: 32,
                recordedAt: '2026-10-24T06:00:00Z',
              },
            ],
          },
        });
      if (path.startsWith('/monitoring/usage'))
        return r.fulfill({
          json: {
            items: [
              {
                device: { label: device.label },
                totalBytes: '33933',
                appBytes: '1073741824',
                createdAt: '2026-10-24T06:00:00Z',
              },
            ],
            pagination: { totalPages: 1 },
          },
        });
      if (path.includes('/rotate-token'))
        return r.fulfill({ json: { token: 'ONE-TIME-MOCK-TOKEN' } });
      if (path.startsWith('/cms/')) {
        const parts = path.split('/').filter(Boolean),
          resource = parts[1];
        if (method === 'POST')
          return r.fulfill({
            status: 201,
            json:
              resource === 'devices'
                ? { device, token: 'ONE-TIME-MOCK-TOKEN' }
                : { id: 'created-mock', ...body },
          });
        if (method === 'PATCH') return r.fulfill({ json: { id: parts[2], ...body } });
        if (method === 'PUT' || method === 'DELETE') return r.fulfill({ status: 204, body: '' });
        if (resource === 'operators' && parts.length > 3)
          return r.fulfill({
            json: { items: parts[3] === 'buses' ? [bus] : [route], pagination: { totalPages: 1 } },
          });
        if (resource === 'buses' && parts.length === 3) return r.fulfill({ json: bus });
        return r.fulfill({
          json:
            resource === 'users'
              ? lists[resource]
              : { items: lists[resource] || [], pagination: { totalPages: 1 } },
        });
      }
      throw Error('Unhandled mock endpoint ' + method + ' ' + path);
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
    await page.goto('http://127.0.0.1:4173');
    await page.getByRole('button', { name: 'Masuk ke workspace' }).waitFor();
    await page.locator('[name=username]').fill('synthetic');
    await page.locator('[name=password]').fill('synthetic-password');
    await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
    await page.locator('.live-stats').waitFor();
    return { context, page };
  }
  try {
    const { page, context } = await setup();
    const nav = async (id: string) => {
      const child = page.locator('.sidebar [data-page="' + id + '"]');
      const group = child.locator('xpath=ancestor::details[1]');
      if ((await group.count()) && !(await group.getAttribute('open').then((v) => v !== null)))
        await group.locator('summary').click();
      await child.click();
      await page.waitForFunction(
        () =>
          !document.querySelector('#module-status') ||
          !document.querySelector('#module-status')?.textContent?.includes('Memperbarui'),
      );
    };
    const close = async () => page.keyboard.press('Escape');
    const save = async () => {
      await page.locator('.management-dialog [type=submit]').click();
      await page.waitForFunction(
        () =>
          !document.querySelector('.management-dialog') ||
          !!document.querySelector('.one-time-token'),
      );
    };
    const field = async (name: string, value: string) => {
      const input = page.locator('.management-dialog [name="' + name + '"]');
      if (await input.evaluate((e) => e.tagName === 'SELECT')) await input.selectOption(value);
      else await input.fill(value);
    };
    const create = async (id: string, values: Record<string, string>) => {
      await nav(id);
      await page.locator('#create').click();
      for (const [key, value] of Object.entries(values)) {
        if (['busId', 'operatorId'].includes(key))
          await page
            .locator('.management-dialog [name="' + key + '"] option[value="' + value + '"]')
            .waitFor({ state: 'attached' });
        await field(key, value);
      }
      await save();
    };
    assert.equal(
      await page.locator('.sidebar').evaluate((e) => getComputedStyle(e).position),
      'fixed',
    );
    assert.ok(await page.getByText('33.933', { exact: true }).isVisible());
    assert.ok(!(await page.locator('.content').innerText()).includes('hidden-raw'));
    assert.ok(!(await page.locator('.content').innerText()).includes('991122'));
    assert.equal(await page.locator('.response-details').count(), 0);

    await nav('fleet');
    await page.getByRole('cell', { name: 'AMJ-001', exact: true }).waitFor();
    await nav('map');
    await page.locator('.leaflet-container').waitFor();
    await nav('alerts');
    await page.getByRole('cell', { name: 'Offline', exact: true }).waitFor();
    await nav('usage');
    await page.getByRole('cell', { name: '33,14 KB', exact: true }).waitFor();
    await page.getByRole('cell', { name: '1 GB', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Akumulasi perangkat', exact: true }).click();
    await page.getByRole('cell', { name: '33,14 KB', exact: true }).waitFor();
    await nav('history');
    await page.locator('[name=deviceId] option[value=device-1]').waitFor({ state: 'attached' });
    await page.locator('[name=deviceId]').selectOption('device-1');
    await page.getByRole('button', { name: 'Terapkan filter', exact: true }).click();
    await page.getByRole('cell', { name: '32 km/j', exact: true }).waitFor();
    await nav('operatorSummary');
    await page.getByRole('cell', { name: '33.933', exact: true }).waitFor();
    await create('operators', { code: 'TEST', name: 'Synthetic operator' });
    await page.locator('[data-action=edit]').first().click();
    await field('name', 'Synthetic operator changed');
    await save();
    await page.locator('[data-action=buses]').first().click();
    await page.getByRole('cell', { name: 'AMJ-001', exact: true }).waitFor();
    await page.locator('#assign').click();
    await page.locator('[name=busId] option[value=bus-1]').waitFor({ state: 'attached' });
    await field('busId', 'bus-1');
    await save();
    await page.locator('[data-action=detach]').first().click();
    await page.locator('#confirm-action').click();
    await page.waitForFunction(() => !document.querySelector('.management-dialog'));
    await page.locator('#back').click();
    await page.locator('[data-action=routes]').first().click();
    await page.locator('#assign').click();
    await page.locator('[name=routeCode] option[value="R/1"]').waitFor({ state: 'attached' });
    await field('routeCode', 'R/1');
    await save();
    await page.locator('[data-action=detach]').first().click();
    await page.locator('#confirm-action').click();
    await page.waitForFunction(() => !document.querySelector('.management-dialog'));
    await create('buses', {
      bodyNo: 'TEST-BUS',
      plateNo: 'B 111 TEST',
      operator: 'TEST',
      model: 'Test model',
    });
    await page.locator('[data-action=detail]').first().click();
    await page.getByRole('dialog').getByRole('cell', { name: 'AMJ-001', exact: true }).waitFor();
    await close();
    await page.locator('[data-action=edit]').first().click();
    await field('model', 'Changed model');
    await save();
    await page.locator('[data-action=remove]').first().click();
    await page.locator('#confirm-action').click();
    await page.waitForFunction(() => !document.querySelector('.management-dialog'));
    await create('routes', { code: 'TEST/ROUTE', value: 'Synthetic route' });
    await page.locator('[data-action=edit]').first().click();
    await field('value', 'Changed route');
    await save();
    await page.locator('[data-action=remove]').first().click();
    await page.locator('#confirm-action').click();
    await page.waitForFunction(() => !document.querySelector('.management-dialog'));
    await create('devices', {
      busId: 'bus-1',
      label: 'Synthetic device',
      sendIntervalMs: '10',
      gpsListenMs: '1',
      configPollIntervalSec: '60',
    });
    await page.locator('.one-time-token').waitFor();
    assert.equal(await page.locator('.one-time-token').inputValue(), 'ONE-TIME-MOCK-TOKEN');
    await close();
    assert.ok(!(await page.locator('.content').innerText()).includes('hidden-secret-hash'));
    const deviceCreate = calls.find((c) => c.path === '/cms/devices' && c.method === 'POST');
    assert.equal(record(deviceCreate?.body).sendIntervalMs, 10000);
    assert.equal(record(deviceCreate?.body).gpsListenMs, 1000);
    await page.locator('[data-action=edit]').first().click();
    await field('sendIntervalMs', '20');
    await save();
    await page.locator('[data-action=rotate]').first().click();
    assert.equal(calls.filter((c) => c.path.includes('rotate-token')).length, 0);
    await page.locator('#confirm-action').click();
    await page.locator('.one-time-token').waitFor();
    await close();
    await page.locator('[data-action=remove]').first().click();
    await page.locator('#confirm-action').click();
    await page.waitForFunction(() => !document.querySelector('.management-dialog'));
    await nav('tickets');
    await page.locator('[data-action=edit]').first().click();
    await field('status', 'IN_PROGRESS');
    await field('note', 'Synthetic note');
    await save();
    await create('users', {
      username: 'synthetic-user',
      password: 'synthetic-password',
      role: 'OPERATOR_VIEWER',
      operatorId: 'operator-1',
    });
    await page.locator('[data-action=edit]').first().click();
    await field('role', 'OPERATOR_ADMIN');
    await save();
    await nav('audit');
    await page.getByRole('cell', { name: 'UPDATE', exact: true }).waitFor();
    await nav('health');
    await page.getByText('Terhubung', { exact: true }).first().waitFor();
    await nav('account');
    await page.getByText('Super admin', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await nav('usage');
    await page.getByRole('cell', { name: '33,14 KB', exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await nav('settings');
    await page.getByRole('button', { name: 'Keluar dari semua perangkat' }).click();
    await page.locator('#confirm-logout').click();
    await page.getByRole('heading', { name: 'Selamat datang kembali.' }).waitFor();
    await page.locator('[name=username]').fill('synthetic');
    await page.locator('[name=password]').fill('synthetic-password');
    await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
    await page.locator('.live-stats').waitFor();
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await page.locator('#profile').click();
    await page.getByRole('heading', { name: 'Selamat datang kembali.' }).waitFor();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    assert.ok(!stored.includes('ONE-TIME-MOCK-TOKEN'));
    assert.ok(!stored.includes('synthetic-password'));
    const second = await setup('OPERATOR_VIEWER');
    assert.equal(await second.page.locator('nav [data-page=users]').count(), 0);
    await second.page.locator('[data-nav-group=operations]>summary').click();
    await second.page.locator('nav [data-page=buses]').click();
    await second.page.getByRole('cell', { name: 'AMJ-001', exact: true }).waitFor();
    assert.equal(await second.page.locator('#create').count(), 0);
    assert.equal(await second.page.locator('[data-action=edit]').count(), 0);
    await second.page.locator('nav [data-page=tickets]').click();
    await second.page.getByRole('cell', { name: 'Membutuhkan bantuan', exact: true }).waitFor();
    assert.equal(await second.page.locator('[data-action=edit]').count(), 0);
    await second.context.close();
    const contract: { method: string; path: string }[] = JSON.parse(
      await readFile(new URL('../fixtures/api-contract.json', import.meta.url), 'utf8'),
    );
    const missing = [];
    let expected = 0;
    for (const endpoint of contract) {
      const regex = new RegExp(
        '^' +
          endpoint.path
            .split('/')
            .map((p) => (p.startsWith('{{') ? '[^/]+' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
            .join('/') +
          '$',
      );
      expected++;
      if (!calls.some((c) => c.method === endpoint.method && regex.test(c.path)))
        missing.push(endpoint.method + ' ' + endpoint.path);
    }

    assert.deepEqual(missing, []);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        matchedCollectionEndpoints: expected,
        readableTables: true,
        byteUnits: true,
        sidebar: true,
        mobile: true,
        crudAndOwnership: true,
        oneTimeToken: true,
        viewerPermissions: true,
        pageErrors: errors,
      }),
    );
    await context.close();
  } finally {
    await Promise.allSettled(ownedContexts.map((context) => context.close()));
  }
});
