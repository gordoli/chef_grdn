import seed from '../../seed/restaurants.json';
import { restaurantInput, type Restaurant } from './restaurants';
export const demoRestaurants: Restaurant[] = seed.restaurants.map((value, index) => ({
  ...restaurantInput.parse(value),
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  created_at: '2026-11-15T00:00:00Z',
  updated_at: '2026-11-15T00:00:00Z',
}));
