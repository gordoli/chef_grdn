import { restaurantCuisineRegions, restaurantNeighborhoods, type Restaurant } from './restaurants';

export type RollStatus = 'both' | 'visited' | 'want_to_go';

export interface RollOption {
  id: string;
  slug: string;
  title: string;
  cuisines: string[];
  familiar: boolean;
  detail: string;
}

export function restaurantRollOptions(restaurants: readonly Restaurant[]): RollOption[] {
  return restaurants.map((restaurant) => ({
    id: restaurant.id,
    slug: restaurant.slug,
    title: restaurant.name,
    cuisines: restaurantCuisineRegions(restaurant.cuisine).length
      ? restaurantCuisineRegions(restaurant.cuisine)
      : ['Other'],
    familiar: restaurant.status === 'visited',
    detail: [restaurantNeighborhoods(restaurant), restaurant.price_range]
      .filter(Boolean)
      .join(' · '),
  }));
}

/** Status and cuisine filters compose; an empty cuisine selection allows every cuisine. */
export function matchingRollOptions(
  options: readonly RollOption[],
  cuisines: readonly string[],
  status: RollStatus = 'both',
) {
  return options.filter(
    (option) =>
      (status === 'both' || option.familiar === (status === 'visited')) &&
      (!cuisines.length || option.cuisines.some((cuisine) => cuisines.includes(cuisine))),
  );
}

/** Pick up to three, including both statuses when possible, preferring unseen options on rerolls. */
export function rollOptions(
  options: readonly RollOption[],
  previousIds: readonly string[] = [],
  random: () => number = Math.random,
): RollOption[] {
  const pool = [...new Map(options.map((option) => [option.id, option])).values()];
  for (let index = pool.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  // Stable sorting keeps random order within the unseen and previously shown groups.
  pool.sort((a, b) => Number(previousIds.includes(a.id)) - Number(previousIds.includes(b.id)));
  const familiar = pool.find((option) => option.familiar);
  const newOne = pool.find((option) => !option.familiar);
  const picks = familiar && newOne ? [familiar, newOne] : [];
  for (const option of pool) {
    if (picks.length === 3) break;
    if (!picks.includes(option)) picks.push(option);
  }
  return picks;
}
