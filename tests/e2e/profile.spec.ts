import { expect, test } from '@playwright/test';

for (const role of ['SUPER_ADMIN', 'OPERATOR_ADMIN', 'OPERATOR_VIEWER'] as const) {
  test(`profile navigation, refresh, and logout for ${role}`, async ({ page }) => {
    const user = {
      id: 'current-user',
      username: 'current.account',
      role,
      operatorId: role === 'SUPER_ADMIN' ? null : 'operator-1',
    };
    const calls: string[] = [];
    let otherOperator = false;
    await page.route('https://tracksmon-dev-api.aestaworks.com/**', (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      calls.push(path);
      if (path === '/auth/refresh') return route.fulfill({ status: 401, json: {} });
      if (path === '/auth/login')
        return route.fulfill({
          json: {
            accessToken: 'test-profile-token',
            tokenType: 'Bearer',
            expiresIn: 900,
            refreshExpiresAt: '2026-11-01T00:00:00Z',
            user,
          },
        });
      if (path === '/auth/me')
        return route.fulfill({
          json: { user: otherOperator ? { ...user, operatorId: 'other-operator' } : user },
        });
      if (path === '/auth/logout') return route.fulfill({ status: 204, body: '' });
      return route.fulfill({ json: { items: [], pagination: { total: 0, totalPages: 1 } } });
    });
    await page.goto('/');
    await page.locator('[name=username]').fill('current.account');
    await page.locator('[name=password]').fill('test-password');
    await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
    await page.getByRole('button', { name: 'Buka profil akun' }).click();
    const profile = page.getByRole('region', { name: 'Profil akun' });
    await expect(profile.getByRole('heading', { name: user.username })).toBeVisible();
    await expect(profile).toContainText('Terautentikasi');
    await expect(page.locator('#profile')).toHaveAttribute('aria-current', 'page');
    expect(calls.filter((path) => path === '/auth/logout')).toHaveLength(0);
    await page.locator('#refresh').click();
    await expect(profile.getByRole('heading', { name: user.username })).toBeVisible();
    expect(calls.filter((path) => path === '/auth/me')).toHaveLength(2);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    otherOperator = true;
    await page.locator('#refresh').click();
    await expect(profile.getByRole('alert')).toContainText('Profil tidak sesuai dengan sesi aktif');
    await expect(profile).not.toContainText('other-operator');
    await expect(profile.locator('dl')).toHaveCount(0);
    await profile.getByRole('button', { name: 'Keluar akun' }).click();
    await expect(page.getByRole('button', { name: 'Masuk ke workspace' })).toBeVisible();
  });
}
