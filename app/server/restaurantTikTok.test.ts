import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleSocialImport,
  handleTikTokImport,
  parseTikTokImport,
} from './restaurantSocialImport';
import {
  canonicalTikTokImportUrl,
  mergeTikTokImport,
  tikTokCaptionDetails,
} from '../src/lib/restaurantTikTok';
import { emptyRestaurant } from '../src/lib/restaurants';
const url = 'https://www.tiktok.com/@reviewer/video/7703216902205721886';
const raw = {
  url,
  description: 'A great meal!\n📍 Ah Ma’s Kitchen\n1115 Clement St, San Francisco, CA 94118\n#sf',
  profile_username: 'reviewer',
  html: '<script>bad()</script>',
  tt_chain_token: 'private-provider-token',
};
const req = (body: unknown) =>
  new Request('https://chef.invalid/api/import-tiktok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => vi.stubEnv('BRIGHTDATA_API_KEY', 'test-only-server-secret'));
afterEach(() => vi.unstubAllEnvs());
describe('TikTok restaurant import', () => {
  it('accepts video and share links while rejecting other hosts and profile pages', () => {
    expect(canonicalTikTokImportUrl(url + '?tracking=1')).toBe(url);
    expect(canonicalTikTokImportUrl('https://vm.tiktok.com/ABC123/')).toBe(
      'https://vm.tiktok.com/ABC123/',
    );
    expect(canonicalTikTokImportUrl('https://www.tiktok.com/t/ABC123/?tracking=1')).toBe(
      'https://www.tiktok.com/t/ABC123/',
    );
    for (const bad of [
      'http://www.tiktok.com/@user/video/7703216902205721886',
      'https://www.tiktok.com.evil.com/t/ABC123',
      'https://user:secret@www.tiktok.com/t/ABC123',
      'https://www.tiktok.com/@reviewer',
      'https://vm.tiktok.com/redirect/extra',
    ])
      expect(canonicalTikTokImportUrl(bad)).toBeNull();
  });
  it('extracts explicit location lines without guessing names from prose', () => {
    expect(tikTokCaptionDetails(raw.description)).toEqual({
      name: 'Ah Ma’s Kitchen',
      address: '1115 Clement St, San Francisco, CA 94118',
    });
    expect(tikTokCaptionDetails('Loved the food at this restaurant! #sf')).toEqual({
      name: '',
      address: null,
    });
    expect(
      tikTokCaptionDetails(
        "Great food 📍 Ah Ma's Kitchen | San Francisco, CA 👀 Would you try it? #sf",
      ).name,
    ).toBe("Ah Ma's Kitchen");
    expect(tikTokCaptionDetails('📍Aziza, 5800 Geary Blvd, San Francisco')).toEqual({
      name: 'Aziza',
      address: '5800 Geary Blvd, San Francisco',
    });
  });
  it('preserves personal and existing business fields while adding the video', () => {
    const imported = parseTikTokImport(raw, url);
    const previous = {
      ...emptyRestaurant,
      name: 'Saved name',
      notes: 'Personal notes',
      rating: 4,
      status: 'visited' as const,
      is_favorite: true,
      price_range: '$20–40',
      photo_urls: ['https://restaurant.com/photo.jpg'],
      locations: [
        {
          neighborhood: 'Richmond',
          address: 'Saved address',
          phone: '4155550100',
          latitude: 37,
          longitude: -122,
        },
      ],
    };
    const next = mergeTikTokImport(previous, imported);
    for (const key of [
      'name',
      'notes',
      'rating',
      'status',
      'is_favorite',
      'price_range',
      'photo_urls',
      'locations',
    ] as const)
      expect(next[key]).toEqual(previous[key]);
    expect(next.video_urls).toEqual([url]);
    expect(mergeTikTokImport(next, imported).video_urls).toEqual([url]);
    const fresh = mergeTikTokImport(emptyRestaurant, imported);
    expect(fresh.name).toBe('Ah Ma’s Kitchen');
    expect(fresh.address).toContain('1115 Clement');
  });
  it('rejects mismatched videos and strips embed HTML and provider session tokens', () => {
    const parsed = parseTikTokImport(raw, url);
    expect(JSON.stringify(parsed)).not.toContain('private-provider-token');
    expect(JSON.stringify(parsed)).not.toContain('<script>');
    expect(() =>
      parseTikTokImport(
        { ...raw, url: url.replace('7703216902205721886', '7703216902205721887') },
        url,
      ),
    ).toThrow('different video');
  });
  it('starts one video and returns an editable preview using owner-bound, source-bound tickets', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ snapshot_id: 'sd_tiktok' }));
    const started = await handleTikTokImport(
      req({ action: 'start', url }),
      fetcher,
      'tiktok-owner',
    );
    const { ticket } = await started.json();
    expect(started.status).toBe(202);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetcher.mock.calls[0];
    expect(new URL(endpoint).searchParams.get('limit_multiple_results')).toBe('1');
    expect(JSON.parse(init.body).input).toHaveLength(1);
    expect(
      (await handleTikTokImport(req({ action: 'poll', ticket }), fetcher, 'other-owner')).status,
    ).toBe(403);
    expect(
      (await handleSocialImport(req({ action: 'poll', ticket }), fetcher, 'tiktok-owner')).status,
    ).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher
      .mockResolvedValueOnce(Response.json({ status: 'ready' }))
      .mockResolvedValueOnce(Response.json([raw]));
    const preview = await handleTikTokImport(
      req({ action: 'poll', ticket }),
      fetcher,
      'tiktok-owner',
    );
    expect(preview.status).toBe(200);
    expect((await preview.json()).name).toBe('Ah Ma’s Kitchen');
  });
});
