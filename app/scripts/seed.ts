import { createClient } from '@supabase/supabase-js';
import seed from '../seed/recipes.json';
import type { Database, Json } from '../src/lib/database.types';
import { parseIngredientsText } from '../src/lib/quantity';
import { parseStepsText } from '../src/lib/recipeText';

const projectUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function seedRecipes() {
  if (!projectUrl || !serviceRoleKey) {
    throw new Error(
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell before running npm run seed.',
    );
  }
  const client = createClient<Database>(projectUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let count = 0;
  for (const { ingredients_text, steps_text, ...recipe } of seed.recipes) {
    const payload = {
      ...recipe,
      ingredients: parseIngredientsText(ingredients_text),
      steps: parseStepsText(steps_text),
    };
    // Serialization removes optional undefined fields and produces the RPC's JSON value.
    const jsonPayload = JSON.parse(JSON.stringify(payload)) as Json;
    const { error } = await client.rpc('upsert_recipe', { r: jsonPayload });
    if (error) throw new Error(`Could not seed ${recipe.slug}: ${error.message}`);
    count += 1;
    console.log(`Saved ${recipe.title}`);
  }
  console.log(`Seeded ${count} recipes.`);
}

seedRecipes().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Recipe seeding failed.');
  process.exitCode = 1;
});
