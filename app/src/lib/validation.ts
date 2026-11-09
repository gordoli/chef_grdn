import { z } from 'zod';
import type { Json } from './database.types';
export const itemSchema = z.object({
  raw: z.string(),
  qty: z.number().nullable().optional(),
  qty_max: z.number().optional(),
  unit: z.string().optional(),
  unit_max: z.string().optional(),
  item: z.string().optional(),
  note: z.string().optional(),
  approx: z.boolean().optional(),
});
export const ingredientSections = z.array(
  z.object({ section: z.string().default(''), items: z.array(itemSchema) }),
);
export const stepSections = z.array(
  z.object({ section: z.string().default(''), steps: z.array(z.string()) }),
);
export function toJson(value: unknown): Json {
  return z.json().parse(value);
}
export const recipeFormSchema = z.object({
  title: z.string().trim().min(1, 'Give your recipe a title.').max(180),
  type: z.string().trim().min(1).max(50),
  ingredients_text: z.string().trim().min(1, 'Add at least one ingredient.').max(50000),
  steps_text: z.string().trim().min(1, 'Add at least one step.').max(50000),
});

export const previewRecipesSchema = z.array(
  z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    cooking_status: z.enum(['made', 'to_try']).default('made'),
    type: z.string(),
    tags: z.array(z.string()),
    servings: z.number().nullable(),
    yield_label: z.string().nullable(),
    time_label: z.string().nullable(),
    intro: z.string().nullable(),
    source_url: z.string().nullable(),
    source_label: z.string().nullable(),
    notion_url: z.string().nullable(),
    ingredients: ingredientSections,
    steps: stepSections,
    notes: z.array(z.string()),
    cover_photo_id: z.string().nullable(),
    sort_order: z.number().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    photos: z.array(
      z.object({
        id: z.string(),
        recipe_id: z.string(),
        storage_path: z.string(),
        caption: z.string().nullable(),
        position: z.number(),
        url: z.string().optional(),
      }),
    ),
  }),
);
export const favoriteIdsSchema = z.array(z.string());
