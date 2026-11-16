import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleSocialImport,
  parseYelpBusiness,
  readSocialCollection,
} from './restaurantSocialImport';
import { emptyRestaurant } from '../src/lib/restaurants';
import { mergeTikTokImport } from '../src/lib/restaurantTikTok';
import {
  canonicalYelpUrl,
  mergeYelpBusiness,
  restaurantPhotoUrls,
} from '../src/lib/restaurantYelp';
const url = 'https://www.yelp.com/biz/test-restaurant-san-francisco';
const image = 'https://s3-media0.fl.yelpcdn.com/bphoto/test-image/o.jpg';
const raw = {
  name: 'Test restaurant',
  url,
  business_id: 'test-restaurant-san-francisco',
  overall_rating: 4.7,
  reviews_count: 100,
  full_address: '10 Main St, San Francisco, CA',
  phone_number: '(415) 555-0100',
  price_range: '$$',
  latitude: 37.7,
  longitude: -122.4,
  opening_hours: { Mon: '12–9' },
  categories: ['Chinese'],
};
const review = {
  url,
  review_id: 'review-1',
  Review_auther: { Username: 'Test reviewer' },
  Rating: 5,
  Content: 'A public review.',
  Review_image: [image, 'https://evil.com/photo.jpg'],
  date_iso_format: '2026-11-16T12:00:00Z',
};
const req = (body: unknown) =>
  new Request('https://chef.invalid/api/import-yelp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => vi.stubEnv('BRIGHTDATA_API_KEY', 'test-only-server-secret'));
afterEach(() => vi.unstubAllEnvs());
describe('Yelp import boundaries', () => {
  it('enriches a TikTok draft with Yelp details and photos without losing the video or personal notes', () => {
    const video = 'https://www.tiktok.com/@yelpnorcal/video/7703216902205721886';
    const draft = mergeTikTokImport(
      { ...emptyRestaurant, notes: 'My notes' },
      {
        video_url: video,
        caption: '📍 Test restaurant | San Francisco, CA',
        author: 'yelpnorcal',
        name: 'Test restaurant',
        address: null,
        location: 'San Francisco, CA',
      },
    );
    const enriched = mergeYelpBusiness(draft, parseYelpBusiness(raw, [review], url));
    expect(enriched.video_urls).toEqual([video]);
    expect(enriched.notes).toBe('My notes');
    expect(enriched.cuisine).toBe('Chinese');
    expect(enriched.address).toBe(raw.full_address);
    expect(enriched.rating).toBeNull();
    expect(restaurantPhotoUrls(enriched)).toEqual([image]);
  });
  it('keeps polling while a ready collection assembles its snapshot', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: 'ready' }))
      .mockResolvedValueOnce(Response.json({ status: 'building' }, { status: 202 }));
    expect(await readSocialCollection('sd_building', 5, fetcher)).toBeNull();
  });
  it('accepts only canonical HTTPS Yelp business URLs', () => {
    expect(canonicalYelpUrl(url + '?tracking=1')).toBe(url);
    for (const bad of [
      'http://www.yelp.com/biz/test',
      'https://yelp.com.evil.com/biz/test',
      'https://user:secret@yelp.com/biz/test',
      'https://yelp.com:123/biz/test',
      'https://yelp.com/biz/a%2Fb',
      'https://yelp.com/search',
      'https://yelp.com/biz/%2E%2E',
    ])
      expect(canonicalYelpUrl(bad)).toBeNull();
  });
  it('keeps Yelp ratings and price tiers distinct from personal fields', () => {
    const business = parseYelpBusiness(raw, [review], url);
    const previous = {
      ...emptyRestaurant,
      name: 'My saved name',
      slug: 'saved',
      status: 'visited' as const,
      rating: 3.5,
      notes: 'My notes',
      visited_on: '2026-11-01',
      companions: ['Alex'],
      is_favorite: true,
      price_range: '$20–40',
      website: 'https://restaurant.com',
      photo_urls: ['https://restaurant.com/cover.jpg'],
      video_urls: ['https://www.instagram.com/reel/ABC/'],
      locations: [
        { neighborhood: 'Mission', address: 'Old address', phone: null, latitude: 1, longitude: 2 },
        {
          neighborhood: 'Other branch',
          address: 'Other address',
          phone: null,
          latitude: 3,
          longitude: 4,
        },
      ],
    };
    const next = mergeYelpBusiness(previous, business);
    for (const field of [
      'name',
      'slug',
      'status',
      'rating',
      'notes',
      'visited_on',
      'companions',
      'is_favorite',
      'price_range',
      'website',
      'photo_urls',
      'video_urls',
    ] as const)
      expect(next[field]).toEqual(previous[field]);
    expect(next.locations[0].address).toBe(raw.full_address);
    expect(next.locations[1]).toEqual(previous.locations[1]);
    expect(next.yelp_data[0].rating).toBe(4.7);
    expect(next.yelp_data[0].price_tier).toBe('$$');
    expect(restaurantPhotoUrls(next)).toEqual(['https://restaurant.com/cover.jpg', image]);
  });
  it('filters untrusted photo hosts and reviews from another business', () => {
    const b = parseYelpBusiness(
      raw,
      [review, { ...review, url: 'https://www.yelp.com/biz/another-place' }],
      url,
    );
    expect(b.reviews).toHaveLength(1);
    expect(b.reviews[0].author).toBe('Test reviewer');
    expect(b.reviews[0].photos).toEqual([image]);
    expect(() =>
      parseYelpBusiness({ ...raw, url: 'https://www.yelp.com/biz/another-place' }, [], url),
    ).toThrow('No matching');
  });
  it('deduplicates repeated imports and updates only the selected location', () => {
    const b = parseYelpBusiness(raw, [review], url);
    const previous = {
      ...emptyRestaurant,
      locations: [
        { neighborhood: 'One', address: 'First', phone: null, latitude: null, longitude: null },
        { neighborhood: 'Two', address: 'Second', phone: null, latitude: null, longitude: null },
      ],
    };
    const once = mergeYelpBusiness(previous, b, 1);
    const twice = mergeYelpBusiness(once, b, 1);
    expect(twice.yelp_data).toHaveLength(1);
    expect(twice.locations[0].address).toBe('First');
    expect(twice.locations[1].address).toBe(raw.full_address);
    expect(() => mergeYelpBusiness(previous, b, 5)).toThrow('Choose a saved location');
  });
  it('rejects oversized and non-Yelp requests before any provider calls', async () => {
    const fetcher = vi.fn();
    expect(
      (
        await handleSocialImport(
          req({ action: 'start', url: 'https://evil.com' }),
          fetcher,
          'bad-url',
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleSocialImport(req({ action: 'start', url: 'x'.repeat(9000) }), fetcher, 'large'))
        .status,
    ).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('binds signed job tickets to the owner and rejects tampering', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ snapshot_id: 'sd_business' }))
      .mockResolvedValueOnce(Response.json({ snapshot_id: 'sd_reviews' }));
    const started = await handleSocialImport(req({ action: 'start', url }), fetcher, 'owner-a');
    const { ticket } = await started.json();
    expect(started.status).toBe(202);
    expect(
      (await handleSocialImport(req({ action: 'poll', ticket }), fetcher, 'owner-b')).status,
    ).toBe(403);
    expect(
      (
        await handleSocialImport(
          req({ action: 'poll', ticket: ticket + 'tampered' }),
          fetcher,
          'owner-a',
        )
      ).status,
    ).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [endpoint, init] of fetcher.mock.calls) {
      expect(init.redirect).toBe('error');
      expect(JSON.parse(init.body).limit_per_input).toBeLessThanOrEqual(5);
      expect(new URL(endpoint).searchParams.get('limit_per_input')).toMatch(/^[15]$/);
    }
  });
  it('returns an editable preview without any database writes', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ snapshot_id: 'sd_business' }))
      .mockResolvedValueOnce(Response.json({ snapshot_id: 'sd_reviews' }));
    const { ticket } = await (
      await handleSocialImport(req({ action: 'start', url }), fetcher, 'preview-owner')
    ).json();
    fetcher
      .mockResolvedValueOnce(Response.json({ status: 'ready' }))
      .mockResolvedValueOnce(Response.json({ status: 'ready' }))
      .mockResolvedValueOnce(Response.json([raw]))
      .mockResolvedValueOnce(Response.json([review]));
    const response = await handleSocialImport(
      req({ action: 'poll', ticket }),
      fetcher,
      'preview-owner',
    );
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.business.reviews[0].photos).toEqual([image]);
    expect(result.warnings.join(' ')).toContain('Website was not returned');
    expect(JSON.stringify(result)).not.toContain('test-only-server-secret');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('does not expose provider errors or credentials', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('echoed test-only-server-secret', { status: 403 }));
    const response = await handleSocialImport(
      req({ action: 'start', url }),
      fetcher,
      'error-owner',
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('test-only-server-secret');
  });
  it('does not download completed business data while reviews are still collecting', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ snapshot_id: 'sd_business' }))
      .mockResolvedValueOnce(Response.json({ snapshot_id: 'sd_reviews' }));
    const { ticket } = await (
      await handleSocialImport(req({ action: 'start', url }), fetcher, 'pending-owner')
    ).json();
    fetcher
      .mockResolvedValueOnce(Response.json({ status: 'ready' }))
      .mockResolvedValueOnce(Response.json({ status: 'running' }));
    const response = await handleSocialImport(
      req({ action: 'poll', ticket }),
      fetcher,
      'pending-owner',
    );
    expect(response.status).toBe(202);
    expect(
      fetcher.mock.calls.slice(2).every(([endpoint]) => String(endpoint).includes('/progress/')),
    ).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
