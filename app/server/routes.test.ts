import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  authenticateOwner: vi.fn(),
  handleImport: vi.fn(),
  handleImportImage: vi.fn(),
}));
vi.mock('./auth', () => ({ authenticateOwner: mocks.authenticateOwner }));
vi.mock('./import', () => ({ handleImport: mocks.handleImport }));
vi.mock('./image', () => ({ handleImportImage: mocks.handleImportImage }));
import { POST as importRecipe } from '../src/app/api/import/route';
import { POST as importImage } from '../src/app/api/import-image/route';
beforeEach(() => {
  vi.resetAllMocks();
});
for (const [name, route, service] of [
  ['recipe', importRecipe, mocks.handleImport],
  ['image', importImage, mocks.handleImportImage],
] as const) {
  describe(`${name} Next.js route authorization`, () => {
    it('returns the authentication failure without fetching an upstream site', async () => {
      const denied = Response.json({ error: 'Sign in' }, { status: 401 });
      mocks.authenticateOwner.mockResolvedValue({ error: denied });
      const response = await route(
        new Request('https://chef.example/api/import', { method: 'POST' }),
      );
      expect(response.status).toBe(401);
      expect(service).not.toHaveBeenCalled();
    });
    it('denies friend access before invoking the import service', async () => {
      mocks.authenticateOwner.mockResolvedValue({
        error: Response.json({ error: 'Owner required' }, { status: 403 }),
      });
      expect(
        (await route(new Request('https://chef.example/api/import', { method: 'POST' }))).status,
      ).toBe(403);
      expect(service).not.toHaveBeenCalled();
    });
    it('passes the verified owner identity and preserves the service response', async () => {
      mocks.authenticateOwner.mockResolvedValue({ userId: 'verified-owner' });
      const expected = new Response(
        name === 'image' ? new Uint8Array([255, 216, 255]) : '{"title":"Soup"}',
        {
          status: 200,
          headers: { 'Content-Type': name === 'image' ? 'image/jpeg' : 'application/json' },
        },
      );
      service.mockResolvedValue(expected);
      const request = new Request('https://chef.example/api/import', { method: 'POST' });
      expect(await route(request)).toBe(expected);
      expect(service).toHaveBeenCalledWith(request, fetch, 'verified-owner');
    });
  });
}
