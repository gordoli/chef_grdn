'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { useSession } from './useSession';
import { RestaurantsContext, type RestaurantReview } from './useRestaurants';
import { supabase } from '@/lib/supabase';
import {
  restaurantInput,
  restaurantRecord,
  type Restaurant,
  type RestaurantInput,
} from '@/lib/restaurants';
const demoKey = 'grdn.demo.restaurants.v2';
export function RestaurantProvider({
  children,
  initialRestaurants,
  isDemo = false,
}: {
  children: ReactNode;
  initialRestaurants: Restaurant[];
  isDemo?: boolean;
}) {
  const { session, profile } = useSession();
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [error, setError] = useState('');
  const canEdit = isDemo || profile?.role === 'owner';
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (isDemo || !supabase) return;
    const current = ++generation.current;
    const { data, error: failure } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at')
      .order('name');
    if (generation.current !== current) return;
    if (failure) {
      setError('Could not refresh restaurants. Please try again.');
      return;
    }
    const parsed = z.array(restaurantRecord).safeParse(data ?? []);
    if (!parsed.success) {
      setError('Some restaurant details could not be loaded.');
      return;
    }
    setRestaurants(parsed.data);
    setError('');
    if (!session) {
      setReviews([]);
      return;
    }
    const [reviewResult, profileResult] = await Promise.all([
      supabase.from('restaurant_reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,display_name'),
    ]);
    if (generation.current !== current) return;
    if (reviewResult.error || profileResult.error) {
      setError('Reviews could not be loaded. Please try again.');
      return;
    }
    setReviews(
      (reviewResult.data ?? []).map((review) => ({
        ...review,
        display_name:
          profileResult.data?.find((person) => person.id === review.author_id)?.display_name ??
          'Friend',
      })),
    );
  }, [isDemo, session]);
  useEffect(() => {
    const requestGeneration = generation;
    if (isDemo) {
      try {
        const stored = localStorage.getItem(demoKey);
        if (stored) setRestaurants(z.array(restaurantRecord).parse(JSON.parse(stored)));
      } catch {
        setError('The browser copy could not be restored.');
      }
    } else {
      void refresh();
    }
    return () => {
      requestGeneration.current++;
    };
  }, [isDemo, refresh]);
  useEffect(() => {
    if (!session) setReviews([]);
  }, [session]);
  const persistDemo = (next: Restaurant[]) => {
    localStorage.setItem(demoKey, JSON.stringify(next));
    setRestaurants(next);
  };
  const save = async (input: RestaurantInput, id?: string): Promise<Restaurant> => {
    if (!canEdit) throw new Error('Sign in as the owner to save restaurants.');
    const parsed = restaurantInput.parse(input);
    if (restaurants.some((r) => r.slug === parsed.slug && r.id !== id))
      throw new Error(
        'A restaurant with this name is already saved. Add a neighborhood to its name.',
      );
    generation.current++;
    if (isDemo) {
      const now = new Date().toISOString();
      const result = {
        ...parsed,
        id: id ?? crypto.randomUUID(),
        created_at: restaurants.find((r) => r.id === id)?.created_at ?? now,
        updated_at: now,
      };
      persistDemo(
        id ? restaurants.map((r) => (r.id === id ? result : r)) : [...restaurants, result],
      );
      return result;
    }
    if (!supabase) throw new Error('Restaurant saving is not configured.');
    const query = id
      ? supabase.from('restaurants').update(parsed).eq('id', id)
      : supabase.from('restaurants').insert(parsed);
    const { data, error: failure } = await query.select().single();
    if (failure)
      throw new Error(
        failure.code === '23505'
          ? 'This restaurant is already saved. Add its neighborhood to the name.'
          : 'Could not save the restaurant. Please try again.',
      );
    const result = restaurantRecord.parse(data);
    setRestaurants((previous) =>
      id ? previous.map((r) => (r.id === id ? result : r)) : [...previous, result],
    );
    return result;
  };
  const setFavorite = async (id: string, value: boolean) => {
    if (!canEdit) throw new Error('Sign in as the owner to change favorites.');
    z.uuid().parse(id);
    generation.current++;
    if (isDemo) {
      persistDemo(
        restaurants.map((restaurant) =>
          restaurant.id === id
            ? { ...restaurant, is_favorite: value, updated_at: new Date().toISOString() }
            : restaurant,
        ),
      );
      return;
    }
    if (!supabase) throw new Error('Restaurant saving is not configured.');
    const { data, error: failure } = await supabase
      .from('restaurants')
      .update({ is_favorite: value })
      .eq('id', id)
      .select('is_favorite,updated_at')
      .single();
    if (failure || !data) throw new Error('Could not change this favorite.');
    setRestaurants((previous) =>
      previous.map((restaurant) =>
        restaurant.id === id ? { ...restaurant, ...data } : restaurant,
      ),
    );
  };
  const remove = async (id: string) => {
    if (!canEdit) throw new Error('Only the owner can remove restaurants.');
    generation.current++;
    if (isDemo) {
      persistDemo(restaurants.filter((r) => r.id !== id));
      return;
    }
    if (!supabase) throw new Error('Restaurant saving is not configured.');
    const { data, error: failure } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (failure || !data) throw new Error('Could not remove this restaurant.');
    setRestaurants((previous) => previous.filter((r) => r.id !== id));
  };
  const saveReview = async (
    restaurantId: string,
    rating: number,
    body: string,
    visitedOn: string | null,
  ) => {
    if (isDemo || !supabase || !session) throw new Error('Sign in to leave a review.');
    const input = z
      .object({
        restaurant_id: z.uuid(),
        rating: z.number().min(0).max(5).multipleOf(0.5),
        body: z.string().trim().max(5000),
        visited_on: z.iso.date().nullable(),
      })
      .parse({ restaurant_id: restaurantId, rating, body, visited_on: visitedOn });
    const { error: failure } = await supabase
      .from('restaurant_reviews')
      .upsert({ ...input, author_id: session.user.id }, { onConflict: 'restaurant_id,author_id' });
    if (failure) throw new Error('Could not save your review.');
    await refresh();
  };
  const removeReview = async (id: string) => {
    if (isDemo || !supabase || !session) throw new Error('Sign in to remove a review.');
    const { data, error: failure } = await supabase
      .from('restaurant_reviews')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (failure || !data) throw new Error('Could not remove this review.');
    setReviews((previous) => previous.filter((review) => review.id !== id));
  };
  return (
    <RestaurantsContext.Provider
      value={{
        restaurants,
        reviews: session ? reviews : [],
        canEdit,
        isDemo,
        error,
        refresh,
        save,
        setFavorite,
        remove,
        saveReview,
        removeReview,
      }}
    >
      {children}
    </RestaurantsContext.Provider>
  );
}
