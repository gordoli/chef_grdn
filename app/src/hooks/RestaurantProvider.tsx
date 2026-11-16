'use client';
import { isOwnerSession } from '@/lib/auth';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { useSession } from './useSession';
import {
  cacheRestaurants,
  freshRestaurants,
  restaurantSnapshot,
  loadRestaurants,
} from './restaurantCache';
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
  const [demoRestored, setDemoRestored] = useState(!isDemo);
  const canEdit = isDemo || isOwnerSession(session, profile);
  const generation = useRef(0);
  const updateRestaurants = (update: Restaurant[] | ((previous: Restaurant[]) => Restaurant[])) => {
    const next =
      typeof update === 'function' ? update(restaurantSnapshot() ?? restaurants) : update;
    if (!isDemo) cacheRestaurants(next);
    setRestaurants(next);
  };
  const loadReviews = useCallback(async () => {
    if (isDemo || !supabase || !session) return [];
    const [reviewResult, profileResult] = await Promise.all([
      supabase.from('restaurant_reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,display_name'),
    ]);
    if (reviewResult.error || profileResult.error)
      throw new Error('Reviews could not be loaded. Please try again.');
    const names = new Map(
      (profileResult.data ?? []).map((person) => [person.id, person.display_name]),
    );
    return (reviewResult.data ?? []).map((review) => ({
      ...review,
      display_name: names.get(review.author_id) ?? 'Friend',
    }));
  }, [isDemo, session]);
  const refresh = useCallback(async () => {
    if (isDemo || !supabase) return;
    const current = ++generation.current;
    try {
      const [records, nextReviews] = await Promise.all([
        loadRestaurants(async () => {
          const { data, error: failure } = await supabase!
            .from('restaurants')
            .select('*')
            .order('created_at')
            .order('name');
          if (failure) throw new Error('Could not refresh restaurants. Please try again.');
          return z.array(restaurantRecord).parse(data ?? []);
        }, true),
        loadReviews(),
      ]);
      if (generation.current !== current) return;
      setRestaurants(records);
      setReviews(nextReviews);
      setError('');
    } catch (failure) {
      if (generation.current === current)
        setError(failure instanceof Error ? failure.message : 'Could not refresh restaurants.');
    }
  }, [isDemo, loadReviews]);
  useEffect(() => {
    const requestGeneration = generation;
    if (isDemo) {
      try {
        const stored = localStorage.getItem(demoKey);
        if (stored) setRestaurants(z.array(restaurantRecord).parse(JSON.parse(stored)));
      } catch {
        setError('The browser copy could not be restored.');
      }
      setDemoRestored(true);
    } else {
      // The server already supplied the collection. Do not immediately download it again.
      setRestaurants(freshRestaurants() ?? cacheRestaurants(initialRestaurants));
    }
    return () => {
      requestGeneration.current++;
    };
  }, [isDemo, initialRestaurants]);
  useEffect(() => {
    let active = true;
    generation.current++;
    setReviews([]);
    if (session && !isDemo)
      void loadReviews()
        .then((next) => {
          if (active) setReviews(next);
        })
        .catch(() => {
          if (active) setError('Reviews could not be loaded. Please try again.');
        });
    return () => {
      active = false;
    };
  }, [session, isDemo, loadReviews]);
  useEffect(() => {
    if (isDemo) return;
    const onFocus = () => {
      if (!freshRestaurants()) void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isDemo, refresh]);
  const invalidatePublicCache = async () => {
    if (isDemo || !session) return;
    try {
      const response = await fetch('/api/restaurants/revalidate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error('Cache refresh failed');
    } catch {
      setError('Saved. Public pages may take up to a minute to refresh.');
    }
  };
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
    updateRestaurants((previous) =>
      id ? previous.map((r) => (r.id === id ? result : r)) : [...previous, result],
    );
    await invalidatePublicCache();
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
    updateRestaurants((previous) =>
      previous.map((restaurant) =>
        restaurant.id === id ? { ...restaurant, ...data } : restaurant,
      ),
    );
    await invalidatePublicCache();
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
    updateRestaurants((previous) => previous.filter((r) => r.id !== id));
    await invalidatePublicCache();
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
      {demoRestored ? (
        children
      ) : (
        <div className="page-loader" role="status">
          Opening your restaurant preview…
        </div>
      )}
    </RestaurantsContext.Provider>
  );
}
