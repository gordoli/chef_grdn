import { collectionLoading } from '@/config/loading';
import type { Restaurant } from '@/lib/restaurants';

// Public portfolio data only. This survives tab-provider remounts, not browser sessions.
let snapshot: Restaurant[] | null = null;
let savedAt = 0;
let revision = 0;
let pending: Promise<Restaurant[]> | null = null;
export function restaurantSnapshot(): Restaurant[] | null {
  return snapshot;
}
export function freshRestaurants(now = Date.now()): Restaurant[] | null {
  return snapshot && now - savedAt < collectionLoading.freshnessMs ? snapshot : null;
}
export function cacheRestaurants(records: Restaurant[], now = Date.now()): Restaurant[] {
  snapshot = records;
  savedAt = now;
  revision++;
  return records;
}
export function clearRestaurantCache(): void {
  snapshot = null;
  savedAt = 0;
  revision++;
  pending = null;
}
export function loadRestaurants(
  load: () => Promise<Restaurant[]>,
  force = false,
): Promise<Restaurant[]> {
  const cached = freshRestaurants();
  if (cached && !force) return Promise.resolve(cached);
  if (pending) return pending;
  const started = revision;
  const request = load().then((records) =>
    started === revision ? cacheRestaurants(records) : (snapshot ?? records),
  );
  pending = request;
  void request
    .finally(() => {
      if (pending === request) pending = null;
    })
    .catch(() => {});
  return request;
}
