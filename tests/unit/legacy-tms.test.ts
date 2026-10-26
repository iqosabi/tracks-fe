import { describe, expect, it, vi } from 'vitest';
import { TmsClient } from '../../src/features/legacy-tms/client';
import { liveSchema } from '../../src/features/legacy-tms/contract';
import { liveRows, mapPositions, menuRows } from '../../src/features/legacy-tms/data';
import { tmsFixtures, tmsLoginFixture } from '../fixtures/tms';
import { activityStore } from '../../src/core/activity/store';

const response = (data: unknown, status = 200) =>
  Response.json({ success: true, metadata: {}, data }, { status });
describe('isolated legacy TMS transport', () => {
  it('logs in with email/password JSON and uses returned access/refresh tokens in memory', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(tmsLoginFixture))
      .mockResolvedValueOnce(response([]));
    const { client, user } = await TmsClient.login(
      { email: ' operator@example.test ', password: 'synthetic-password!' },
      new AbortController().signal,
      fetcher,
    );
    expect(user).toMatchObject({ fullName: 'Pengguna contoh', role: 'GOD_MODE', operatorId: null });
    expect(fetcher.mock.calls[0]).toEqual([
      'https://api-tms.aestaworks.com/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'operator@example.test', password: 'synthetic-password!' }),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
      }),
    ]);
    await client.read('fleets');
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer local-test' });
    client.dispose();
    expect(activityStore.snapshot()).toBe(0);
  });
  it('rejects wrong credentials, failed envelopes and malformed login data without returning a session', async () => {
    for (const result of [
      new Response('', { status: 401 }),
      Response.json({ success: false, data: null }),
      response({ accessToken: 'invalid-test' }),
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(result);
      await expect(
        TmsClient.login(
          { email: 'operator@example.test', password: 'synthetic' },
          new AbortController().signal,
          fetcher,
        ),
      ).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(activityStore.snapshot()).toBe(0);
    }
  });
  it('does not create a session if login finishes after navigation aborts it', async () => {
    const abort = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      abort.abort();
      return response(tmsLoginFixture);
    });
    await expect(
      TmsClient.login(
        { email: 'operator@example.test', password: 'synthetic' },
        abort.signal,
        fetcher,
      ),
    ).rejects.toThrow();
    expect(activityStore.snapshot()).toBe(0);
  });
  it('consumes data envelope with bearer auth, no cache/cookies, no CMS URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([]));
    const client = new TmsClient('Bearer local-test', '', fetcher);
    expect(await client.read('fleets')).toEqual([]);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api-tms.aestaworks.com/api/fleets',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer local-test' }),
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      }),
    );
    client.dispose();
    await expect(client.read('live')).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(activityStore.snapshot()).toBe(0);
  });
  it('shares one refresh across concurrent 401s and retries each read once', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      if (String(input).endsWith('/auth/refresh')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ Authorization: 'Bearer refresh-test' });
        return response({ accessToken: 'renewed-test', refreshToken: 'new-refresh-test' });
      }
      return (init?.headers as Record<string, string>).Authorization === 'Bearer renewed-test'
        ? response([])
        : response(null, 401);
    });
    const client = new TmsClient('expired-test', 'refresh-test', fetcher);
    await Promise.all([client.read('fleets'), client.read('stations')]);
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh')),
    ).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(5);
    client.dispose();
  });
  it('surfaces forbidden and missing endpoints without refreshing or rendering HTML', async () => {
    for (const status of [403, 404]) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('<html>private</html>', { status }));
      const client = new TmsClient('local-test', 'refresh-test', fetcher);
      await expect(client.read('menus')).rejects.toMatchObject({ status });
      expect(fetcher).toHaveBeenCalledTimes(1);
      client.dispose();
    }
  });
  it('rejects unsuccessful/invalid envelopes and releases the loading indicator', async () => {
    for (const body of [{ success: false, data: [] }, { items: [] }]) {
      const client = new TmsClient(
        'local-test',
        '',
        vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)),
      );
      await expect(client.read('fleets')).rejects.toThrow('respons TMS');
      expect(activityStore.snapshot()).toBe(0);
      client.dispose();
    }
  });
  it('cannot revive a disposed session when refresh finishes late', async () => {
    let release: (value: Response) => void = () => {};
    const gate = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (url) =>
        String(url).endsWith('/auth/refresh') ? gate : response(null, 401),
      );
    const client = new TmsClient('expired-test', 'refresh-test', fetcher);
    const read = client.read('live');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    client.dispose();
    release(response({ accessToken: 'new-test', refreshToken: 'new-refresh-test' }));
    await expect(read).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
describe('TMS adapters', () => {
  it('flattens operator groups, strips private fields and maps real GPS/time', () => {
    const data = liveSchema.parse(tmsFixtures['/fleets/live-status']);
    const rows = liveRows(data);
    expect(rows).toHaveLength(24);
    expect(rows[0]).not.toHaveProperty('token');
    const positions = mapPositions(rows);
    expect(positions[0]).toMatchObject({
      id: 'TEST:BUS-001',
      label: 'BUS-001',
      speed: 1,
      delayMs: 1333,
      overspeed: false,
    });
  });
  it('falls back from invalid active GPS, preserves zero, rejects missing GPS and unknown delay', () => {
    const rows = liveRows(liveSchema.parse(tmsFixtures['/fleets/live-status']));
    const base = rows[0];
    const positions = mapPositions([
      {
        ...base,
        activePosition: { lat: 999, lon: 0 },
        lastPosition: { lat: 0, lon: 0 },
        deviceTime: null,
      },
      { ...base, busId: 'missing', activePosition: null, lastPosition: null },
    ]);
    expect(positions).toHaveLength(1);
    expect(positions[0]).toMatchObject({ lat: 0, lng: 0, delayMs: null });
  });
  it('flattens nested menus with readable parents', () => {
    expect(
      menuRows([{ title: 'Parent', children: [{ title: 'Child', roles: ['VIEWER'] }] }])[1],
    ).toMatchObject({ parentTitle: 'Parent', rolesText: 'VIEWER' });
  });
});
