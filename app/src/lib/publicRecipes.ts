import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { Recipe } from './types';
import { ingredientSections, stepSections } from './validation';

// Only public recipe data enters the server-rendered portfolio. Sessions stay client-side.
export const getPublicRecipes = unstable_cache(
  async (): Promise<Recipe[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [recipes, photos] = await Promise.all([
      client.from('recipes').select('*').order('sort_order'),
      client.from('recipe_photos').select('*').order('position'),
    ]);
    if (recipes.error) throw recipes.error;
    if (photos.error) throw photos.error;
    const paths = (photos.data ?? []).map((photo) => photo.storage_path);
    const signed = paths.length
      ? await client.storage.from('recipe-photos').createSignedUrls(paths, 3600)
      : { data: [], error: null };
    if (signed.error) throw signed.error;
    const urls = new Map((signed.data ?? []).map((photo) => [photo.path, photo.signedUrl]));
    return (recipes.data ?? []).map((recipe) => ({
      ...recipe,
      ingredients: ingredientSections.parse(recipe.ingredients),
      steps: stepSections.parse(recipe.steps),
      photos: (photos.data ?? [])
        .filter((photo) => photo.recipe_id === recipe.id)
        .map((photo) => ({ ...photo, url: urls.get(photo.storage_path) ?? undefined })),
    }));
  },
  ['public-recipe-portfolio'],
  { revalidate: 60 },
);
