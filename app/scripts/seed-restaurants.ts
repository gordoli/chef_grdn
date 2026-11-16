import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import seed from '../seed/restaurants.json';
import type { Database } from '../src/lib/database.types';
import { restaurantInput } from '../src/lib/restaurants';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding restaurants.');
const client = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const restaurants = z.array(restaurantInput).parse(seed.restaurants);
// Ignore existing slugs so repeat seeding never overwrites personal notes or ratings.
const { error } = await client
  .from('restaurants')
  .upsert(restaurants, { onConflict: 'slug', ignoreDuplicates: true });
if (error) throw new Error(`Could not seed restaurants: ${error.message}`);
console.log(`Saved ${restaurants.length} starter restaurants; existing entries preserved.`);
