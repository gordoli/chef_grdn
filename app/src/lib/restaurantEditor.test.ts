import { describe, expect, it } from 'vitest';
import { emptyRestaurant, restaurantInput } from './restaurants';
import {
  restaurantEditorSteps,
  restaurantEditorFieldStep,
  restaurantEditorInput,
  mergeRestaurantWebsite,
} from './restaurantEditor';
import { restaurantGalleryUrls, restaurantPhotoUrls } from './restaurantYelp';
const first = 'https://restaurant.com/one.jpg',
  chosen = 'https://restaurant.com/two.jpg';
describe('restaurant gallery and save preparation', () => {
  it('keeps legacy defaults and pins the chosen thumbnail without duplicating it', () => {
    const legacy = restaurantInput.parse({
      ...emptyRestaurant,
      slug: 'test',
      name: 'Test',
      photo_urls: [first, chosen],
    });
    expect(legacy.thumbnail_url).toBeNull();
    expect(restaurantPhotoUrls(legacy)).toEqual([first, chosen]);
    expect(restaurantPhotoUrls({ ...legacy, thumbnail_url: chosen })).toEqual([chosen, first]);
    expect(restaurantGalleryUrls({ ...legacy, thumbnail_url: chosen })).toEqual([first, chosen]);
    expect(restaurantPhotoUrls({ ...legacy, photo_urls: [first], thumbnail_url: chosen })).toEqual([
      chosen,
      first,
    ]);
  });
  it('clears a removed thumbnail and preserves personal state until saving', () => {
    const draft = {
      ...emptyRestaurant,
      name: 'Saved',
      status: 'want_to_go' as const,
      rating: 4.5,
      visited_on: '2026-11-01',
      notes: 'My notes',
      thumbnail_url: chosen,
    };
    const result = restaurantEditorInput(draft, {
      photos: `${first}\n${chosen}`,
      videos: '',
      companions: 'Alex, Sam',
      excludedPhotos: [chosen],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.thumbnail_url).toBeNull();
    expect(result.data.photo_urls).toEqual([first]);
    expect(result.data.rating).toBeNull();
    expect(result.data.visited_on).toBeNull();
    expect(result.data.notes).toBe('My notes');
    expect(result.data.companions).toEqual(['Alex', 'Sam']);
    expect(draft.rating).toBe(4.5);
  });
  it('routes address errors to main details and photo errors to the gallery', () => {
    expect(restaurantEditorSteps('visited')).toEqual(['main', 'gallery', 'personal', 'links']);
    expect(restaurantEditorSteps('want_to_go')).toEqual(['main', 'gallery', 'links']);
    expect(restaurantEditorFieldStep('locations')).toBe('main');
    expect(restaurantEditorFieldStep('thumbnail_url')).toBe('gallery');
    const invalid = restaurantEditorInput(
      { ...emptyRestaurant, name: 'Test', thumbnail_url: 'http://127.0.0.1/private' },
      { photos: '', videos: '', companions: '', excludedPhotos: [] },
    );
    expect(invalid.success).toBe(false);
  });
  it('updates primary website details without erasing the thumbnail, Yelp link or personal fields', () => {
    const previous = {
      ...emptyRestaurant,
      name: 'My name',
      slug: 'my-name',
      notes: 'My notes',
      thumbnail_url: chosen,
      yelp_url: 'https://www.yelp.com/biz/test',
      locations: [
        { neighborhood: 'Mission', address: 'Old', phone: null, latitude: 1, longitude: 2 },
        { neighborhood: 'Other', address: 'Other', phone: null, latitude: 3, longitude: 4 },
      ],
    };
    const imported = {
      ...emptyRestaurant,
      name: 'Imported',
      address: 'New',
      website: 'https://restaurant.com',
    };
    const next = mergeRestaurantWebsite(previous, imported);
    expect(next.name).toBe(previous.name);
    expect(next.notes).toBe(previous.notes);
    expect(next.thumbnail_url).toBe(chosen);
    expect(next.yelp_url).toBe(previous.yelp_url);
    expect(next.locations[1]).toEqual(previous.locations[1]);
    expect(next.address).toBe('New');
    expect(next.latitude).toBeNull();
    expect(next.longitude).toBeNull();
  });
});
