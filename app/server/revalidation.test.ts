import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ authenticateOwner: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('./auth', () => ({ authenticateOwner: mocks.authenticateOwner }));
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
import { POST } from '../src/app/api/restaurants/revalidate/route';
beforeEach(() => vi.resetAllMocks());
describe('public restaurant cache invalidation', () => {
  it.each([401, 403])('denies unauthorized invalidation (%s)', async (status) => {
    mocks.authenticateOwner.mockResolvedValue({
      error: Response.json({ error: 'Owner required' }, { status }),
    });
    expect(
      (
        await POST(
          new Request('https://chef-grdn.vercel.app/api/restaurants/revalidate', {
            method: 'POST',
          }),
        )
      ).status,
    ).toBe(status);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
  it('expires the public cache immediately after verified owner changes', async () => {
    mocks.authenticateOwner.mockResolvedValue({ userId: 'owner' });
    const result = await POST(
      new Request('https://chef-grdn.vercel.app/api/restaurants/revalidate', { method: 'POST' }),
    );
    expect(result.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledWith('public-restaurant-portfolio', { expire: 0 });
    expect(result.headers.get('Cache-Control')).toBe('no-store');
  });
});
