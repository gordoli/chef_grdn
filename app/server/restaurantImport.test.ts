import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }));
vi.mock('node:https', () => ({ request: mocks.request }));
import { fetchRestaurantResource, isPublicAddress } from './restaurantFetch';
import { parseRestaurantHtml, handleRestaurantImport } from './restaurantImport';
describe('restaurant website import', () => {
  it('reads nested JSON-LD without importing public ratings as the owner’s rating', () => {
    const result = parseRestaurantHtml(
      `<script type="application/ld+json">{"@graph":[{"@type":"Restaurant","name":"A &amp; B","servesCuisine":["Thai","Lao"],"address":{"streetAddress":"100 Main St","addressLocality":"San Francisco"},"telephone":"415-555-1234","priceRange":"$20-30","image":["/dinner.jpg",{"contentUrl":"https://cdn.public.org/pasta.png"}],"geo":{"latitude":"37.7","longitude":"-122.4"},"aggregateRating":{"ratingValue":4.9}}]}</script>`,
      'https://restaurant.org/',
    );
    expect(result).toMatchObject({
      name: 'A & B',
      cuisine: 'Thai, Lao',
      address: '100 Main St, San Francisco',
      latitude: 37.7,
      longitude: -122.4,
      rating: null,
      status: 'want_to_go',
      price_range: '$20-30',
    });
    expect(result.photo_urls).toEqual([
      'https://restaurant.org/dinner.jpg',
      'https://cdn.public.org/pasta.png',
    ]);
  });
  it('falls back to Open Graph and rejects unsupported prices and image schemes', () => {
    const result = parseRestaurantHtml(
      '<meta property="og:title" content="Dinner"><meta property="og:image" content="javascript:alert(1)"><script type="application/ld+json">{"@type":"Restaurant","priceRange":"$$"}</script>',
      'https://restaurant.org/',
    );
    expect(result.name).toBe('Dinner');
    expect(result.photo_urls).toEqual([]);
    expect(result.price_range).toBeNull();
  });
  it('ignores empty metadata, website furniture and placeholders when selecting photos', () => {
    const result = parseRestaurantHtml(
      '<title>Dinner</title><img src="/vip.png"><img src="/placeholder.png"><img src="/dinner.jpg">',
      'https://restaurant.org/',
    );
    expect(result.photo_urls).toEqual(['https://restaurant.org/dinner.jpg']);
  });
  it('rejects private DNS answers before opening a connection', async () => {
    mocks.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(fetchRestaurantResource('https://restaurant.org')).rejects.toThrow(
      'not supported',
    );
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('blocks reserved IP ranges including mapped IPv6 and metadata endpoints', () => {
    for (const address of [
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '192.168.1.1',
      '100.64.0.1',
      '::1',
      '::ffff:127.0.0.1',
      'fc00::1',
      'fe80::1',
      '2001:db8::1',
    ])
      expect(isPublicAddress(address), address).toBe(false);
    expect(isPublicAddress('1.1.1.1')).toBe(true);
  });
  it('rejects malformed and oversized input without fetching upstream', async () => {
    for (const [body, status] of [
      ['invalid json', 400],
      [JSON.stringify({ url: 'javascript:alert(1)' }), 400],
      [JSON.stringify({ url: 'https://instagram.com/reel/ABC/' }), 422],
      [JSON.stringify({ url: 'x'.repeat(5000) }), 413],
    ] as const) {
      const response = await handleRestaurantImport(
        new Request('https://grdn.recipes/api/import-restaurant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
        fetch,
        `test-${status}-${body.length}`,
      );
      expect(response.status).toBe(status);
    }
  });
});
