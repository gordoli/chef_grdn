import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clientMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: clientMock.createClient }));
import { authenticateOwner } from './auth';

function request(token?: string): Request {
  return new Request('https://chef-grdn.example/api/import', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
  clientMock.createClient.mockReturnValue({
    auth: { getUser: clientMock.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: clientMock.maybeSingle }) }) }),
  });
  clientMock.getUser.mockResolvedValue({ data: { user: { id: 'verified-user-id' } }, error: null });
  clientMock.maybeSingle.mockResolvedValue({ data: { role: 'owner' }, error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('import owner authorization', () => {
  it('requires a bearer token', async () => {
    expect((await authenticateOwner(request())).error?.status).toBe(401);
    expect(clientMock.createClient).not.toHaveBeenCalled();
  });
  it('verifies the token and database role instead of trusting caller identity', async () => {
    expect(await authenticateOwner(request('session-token'))).toEqual({
      userId: 'verified-user-id',
    });
    expect(clientMock.getUser).toHaveBeenCalledWith('session-token');
    expect(clientMock.createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'public-test-key',
      expect.objectContaining({
        global: { headers: { Authorization: 'Bearer session-token' } },
      }),
    );
  });
  it('rejects an expired session', async () => {
    clientMock.getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    expect((await authenticateOwner(request('expired'))).error?.status).toBe(401);
    expect(clientMock.maybeSingle).not.toHaveBeenCalled();
  });
  it('rejects friend accounts', async () => {
    clientMock.maybeSingle.mockResolvedValue({ data: { role: 'friend' }, error: null });
    expect((await authenticateOwner(request('friend'))).error?.status).toBe(403);
  });
  it('does not authorize users with missing profiles', async () => {
    clientMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await authenticateOwner(request('missing-profile'))).error?.status).toBe(403);
  });
  it('reports database setup failures without exposing database details', async () => {
    clientMock.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error('internal database detail'),
    });
    const result = await authenticateOwner(request('token'));
    expect(result.error?.status).toBe(503);
    expect(await result.error?.text()).not.toContain('internal database detail');
  });
  it('fails closed when authentication is unreachable', async () => {
    clientMock.getUser.mockRejectedValue(new Error('upstream unavailable'));
    expect((await authenticateOwner(request('token'))).error?.status).toBe(503);
  });
});
