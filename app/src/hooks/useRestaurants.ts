'use client';
import { createContext, useContext } from 'react';
import type { Restaurant, RestaurantInput } from '@/lib/restaurants';
export interface RestaurantReview {
  id: string;
  restaurant_id: string;
  author_id: string;
  rating: number;
  body: string;
  visited_on: string | null;
  created_at: string;
  updated_at: string;
  display_name?: string;
}
export interface RestaurantsState {
  restaurants: Restaurant[];
  reviews: RestaurantReview[];
  canEdit: boolean;
  isDemo: boolean;
  error: string;
  refresh: () => Promise<void>;
  save: (input: RestaurantInput, id?: string) => Promise<Restaurant>;
  setFavorite: (id: string, value: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  saveReview: (
    restaurantId: string,
    rating: number,
    body: string,
    visitedOn: string | null,
  ) => Promise<void>;
  removeReview: (id: string) => Promise<void>;
}
export const RestaurantsContext = createContext<RestaurantsState | null>(null);
export function useRestaurants() {
  const value = useContext(RestaurantsContext);
  if (!value) throw new Error('useRestaurants requires RestaurantProvider');
  return value;
}
