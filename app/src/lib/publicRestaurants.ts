import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { restaurantRecord, type Restaurant } from './restaurants';

// Request-local memoization keeps metadata and the page in sync. No session data enters here.
export const getPublicRestaurants = cache(async (): Promise<Restaurant[]> => {
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
});
