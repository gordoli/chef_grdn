import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoRestaurants } from '../lib/restaurantSeeds';
import {
  cacheRestaurants,
  clearRestaurantCache,
  freshRestaurants,
  loadRestaurants,
} from './restaurantCache';
beforeEach(clearRestaurantCache);
describe('public restaurant browser cache', () => {
  it('reuses fresh records and expires them after a minute', () => {
    cacheRestaurants(demoRestaurants, 1000);
    expect(freshRestaurants(60999)).toBe(demoRestaurants);
    expect(freshRestaurants(61000)).toBeNull();
  });
  it('deduplicates simultaneous collection requests', async () => {
    let finish!: (value: typeof demoRestaurants) => void;
    const load = vi.fn(
      () =>
        new Promise<typeof demoRestaurants>((resolve) => {
          finish = resolve;
        }),
    );
    const first = loadRestaurants(load);
    const second = loadRestaurants(load);
    expect(first).toBe(second);
    expect(load).toHaveBeenCalledTimes(1);
    finish(demoRestaurants);
    await first;
    expect(await loadRestaurants(load)).toBe(demoRestaurants);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('does not overwrite an owner edit with a response started before that edit', async () => {
    let finish!: (value: typeof demoRestaurants) => void;
    const request = loadRestaurants(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const edited = demoRestaurants.map((restaurant) => ({ ...restaurant, is_favorite: false }));
    cacheRestaurants(edited);
    finish(demoRestaurants);
    expect(await request).toBe(edited);
    expect(freshRestaurants()).toBe(edited);
  });
  it('allows retrying a failed load without retaining a rejected request', async () => {
    await expect(loadRestaurants(() => Promise.reject(new Error('offline')))).rejects.toThrow(
      'offline',
    );
    expect(await loadRestaurants(() => Promise.resolve(demoRestaurants))).toBe(demoRestaurants);
  });
});
