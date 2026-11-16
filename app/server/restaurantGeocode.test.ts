import { describe, expect, it, vi } from 'vitest';
import { geocodeRestaurantAddress } from './restaurantGeocode';
describe('restaurant address geocoding', () => {
  it('only pins a single valid match and keeps the upstream origin fixed', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ result: { addressMatches: [{ coordinates: { x: -122.4, y: 37.7 } }] } }),
      );
    expect(await geocodeRestaurantAddress('100 Main St, San Francisco', fetcher)).toEqual({
      latitude: 37.7,
      longitude: -122.4,
    });
    const url = fetcher.mock.calls[0][0] as URL;
    expect(url.origin).toBe('https://geocoding.geo.census.gov');
    expect(url.searchParams.get('address')).toBe('100 Main St, San Francisco');
  });
  it('leaves ambiguous, invalid and unavailable locations unpinned', async () => {
    for (const matches of [[], [{ coordinates: { x: 200, y: 100 } }], [{}, {}]]) {
      const fetcher = vi
        .fn()
        .mockResolvedValue(Response.json({ result: { addressMatches: matches } }));
      expect(await geocodeRestaurantAddress('Ambiguous address', fetcher)).toBeNull();
    }
    expect(
      await geocodeRestaurantAddress('Address', vi.fn().mockRejectedValue(new Error('offline'))),
    ).toBeNull();
  });
});
