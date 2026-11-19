import { collectionLoading } from '@/config/loading';
import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { restaurantRecord, type Restaurant } from './restaurants';

// Only anonymous portfolio rows enter this cross-request cache; reviews and sessions never do.
const readPublicRestaurants = unstable_cache(
  async (): Promise<Restaurant[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data, error } = await client
      .from('restaurants')
      .select('*')
      .order('created_at')
      .order('name');
    if (error) throw new Error('Restaurants could not be loaded. Check the database setup.');
    return (data ?? []).map((row) => restaurantRecord.parse(row));
  },
  // Version the parsed row shape so a deployment cannot reuse pre-Yelp cached objects.
  ['public-restaurant-portfolio-v5-takeout'],
  { revalidate: collectionLoading.freshnessSeconds, tags: ['public-restaurant-portfolio'] },
);

// Deduplicate layout, metadata and page reads within the same request as well.
export const getPublicRestaurants = cache(readPublicRestaurants);
