import { describe, expect, it } from 'vitest';
import {
  emptyRestaurant,
  restaurantInput,
  restaurantVideo,
  restaurantSlug,
  restaurantLocations,
  restaurantNeighborhoods,
  restaurantInTab,
  restaurantCanonicalSlug,
  restaurantCuisineRegions,
} from './restaurants';
import { restaurantMetadata, restaurantShareUrl } from './restaurantSharing';
import { demoRestaurants } from './restaurantSeeds';
describe('restaurant records', () => {
  it('keeps requested places and TikTok additions on the want-to-go list without invented ratings', () => {
    expect(demoRestaurants).toHaveLength(28);
    expect(demoRestaurants.filter((r) => r.status === 'want_to_go').map((r) => r.name)).toEqual([
      'Kevin’s Noodle House',
      'Pang',
      'Sam Tung',
      'Four Kings',
      'Brothers',
      'Ah Ma’s Kitchen',
      'Aziza',
    ]);
    expect(demoRestaurants.every((r) => r.rating === null && r.visited_on === null)).toBe(true);
    expect(demoRestaurants.find((r) => r.slug === 'ah-mas-kitchen')?.video_urls).toEqual([
      'https://www.tiktok.com/@yelpnorcal/video/7703216902205721886',
    ]);
    expect(demoRestaurants.find((r) => r.slug === 'aziza')?.video_urls).toEqual([
      'https://www.tiktok.com/@mari_h_moto/video/7704090544766569758',
    ]);
  });
  it('rejects impossible ratings, mixed statuses, bad dates and partial coordinates', () => {
    const base = { ...emptyRestaurant, name: 'Dinner', slug: 'dinner', status: 'visited' };
    for (const patch of [
      { rating: 5.5 },
      { rating: 4.3 },
      { visited_on: '2026-02-30' },
      { latitude: 37 },
      { status: 'want_to_go', rating: 4 },
    ])
      expect(restaurantInput.safeParse({ ...base, ...patch }).success).toBe(false);
    expect(
      restaurantInput.parse({
        ...base,
        rating: 4.5,
        visited_on: '2026-11-15',
        companions: ['Alex', 'Jamie'],
      }).companions,
    ).toEqual(['Alex', 'Jamie']);
  });
  it('requires a numeric price range and public HTTPS links', () => {
    const base = { ...emptyRestaurant, name: 'Dinner', slug: 'dinner' };
    for (const price of ['$$', '$40–20', '$20', '$-5–20'])
      expect(restaurantInput.safeParse({ ...base, price_range: price }).success).toBe(false);
    expect(restaurantInput.parse({ ...base, price_range: '$20–30' }).price_range).toBe('$20–30');
    for (const website of [
      'javascript:alert(1)',
      'http://example.com',
      'https://localhost/',
      'https://127.0.0.1',
      'https://user:pass@public.org',
    ])
      expect(restaurantInput.safeParse({ ...base, website }).success).toBe(false);
  });
  it('creates stable readable slugs', () => {
    expect(restaurantSlug('Kevin’s Noodle House')).toBe('kevins-noodle-house');
  });
});
describe('restaurant videos and shares', () => {
  it('only derives embeds from canonical supported social post links', () => {
    expect(restaurantVideo('https://www.instagram.com/reel/Abc_123/?igsh=x')?.embed).toBe(
      'https://www.instagram.com/reel/Abc_123/embed/',
    );
    expect(
      restaurantVideo('https://www.tiktok.com/@chef/video/1234567890123456789?x=1')?.embed,
    ).toBe('https://www.tiktok.com/player/v1/1234567890123456789');
    for (const url of [
      'https://instagram.com.evil.org/reel/abc/',
      'https://vm.tiktok.com/abc',
      'https://www.instagram.com/chef/',
      '<iframe src="evil"></iframe>',
    ])
      expect(restaurantVideo(url)).toBeNull();
  });
  it('uses a clean canonical and revisioned custom preview and share URL', () => {
    const restaurant = demoRestaurants[0];
    const metadata = restaurantMetadata(restaurant);
    expect(metadata.alternates?.canonical).toBe('/restaurants/gao-viet');
    expect(JSON.stringify(metadata.openGraph)).toContain('/restaurants/gao-viet/share-image?v=');
    const url = restaurantShareUrl(
      restaurant,
      'https://grdn.recipes/restaurants/gao-viet?add=1#videos',
    );
    expect(url).toContain('?share=');
    expect(url).not.toContain('add=');
    expect(url).not.toContain('#');
    expect(restaurantShareUrl({ ...restaurant, updated_at: '2026-11-16T00:00:00Z' }, url)).not.toBe(
      url,
    );
  });
});

describe('restaurant collection and locations', () => {
  it('groups food styles under countries while retaining multi-region restaurants', () => {
    expect(restaurantCuisineRegions('Chinese / Dim sum')).toEqual(['Chinese']);
    expect(restaurantCuisineRegions('Chinese / Noodles')).toEqual(['Chinese']);
    expect(restaurantCuisineRegions('Cantonese')).toEqual(['Chinese']);
    expect(restaurantCuisineRegions('Japanese / Ramen')).toEqual(['Japanese']);
    expect(restaurantCuisineRegions('Korean BBQ')).toEqual(['Korean']);
    expect(restaurantCuisineRegions('Pizza')).toEqual(['Italian']);
    expect(restaurantCuisineRegions('Pakistani / Indian')).toEqual(['Pakistani', 'Indian']);
    expect(restaurantCuisineRegions('Californian / Mediterranean')).toEqual([
      'Californian',
      'Mediterranean',
    ]);
    expect(restaurantCuisineRegions('')).toEqual([]);
    expect(restaurantCuisineRegions(' Moroccan ')).toEqual(['Moroccan']);
  });
  it('keeps favorites independent from visit status', () => {
    expect(restaurantInTab({ status: 'want_to_go', is_favorite: true }, 'favorites')).toBe(true);
    expect(restaurantInTab({ status: 'want_to_go', is_favorite: true }, 'visited')).toBe(false);
    expect(restaurantInTab({ status: 'visited', is_favorite: false }, 'visited')).toBe(true);
    expect(restaurantInTab({ status: 'visited', is_favorite: false }, 'favorites')).toBe(false);
  });
  it('combines Dumpling Story into one entry with both neighborhoods and independent locations', () => {
    const stories = demoRestaurants.filter((restaurant) =>
      restaurant.slug.startsWith('dumpling-story'),
    );
    expect(stories).toHaveLength(1);
    expect(restaurantNeighborhoods(stories[0])).toBe('Mission / Pacific Heights');
    expect(restaurantLocations(stories[0]).map((location) => location.address)).toEqual([
      '694 Valencia St, San Francisco, CA 94110',
      '2114 Fillmore St, San Francisco, CA 94115',
    ]);
    expect(stories[0].photo_urls[0]).toContain('lh3.googleusercontent.com/');
    expect(
      demoRestaurants.some((restaurant) => ['la-taq', 'el-faro'].includes(restaurant.slug)),
    ).toBe(false);
    expect(restaurantCanonicalSlug('dumpling-story-valencia')).toBe('dumpling-story');
    expect(restaurantCanonicalSlug('dumpling-story-fillmore')).toBe('dumpling-story');
  });
  it('supports legacy single locations and validates coordinates in every branch', () => {
    const legacy = {
      ...emptyRestaurant,
      name: 'Dinner',
      slug: 'dinner',
      neighborhood: 'Sunset',
      address: '1 Main St',
    };
    expect(restaurantNeighborhoods(legacy)).toBe('Sunset');
    expect(
      restaurantInput.safeParse({
        ...legacy,
        locations: [
          { neighborhood: 'Mission', address: null, phone: null, latitude: 37, longitude: null },
        ],
      }).success,
    ).toBe(false);
    expect(
      restaurantInput.safeParse({
        ...legacy,
        locations: [
          { neighborhood: 'Mission', address: null, phone: null, latitude: 37, longitude: -122 },
        ],
      }).success,
    ).toBe(true);
  });
});
