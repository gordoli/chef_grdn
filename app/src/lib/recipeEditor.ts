import { z } from 'zod';
import { recipeFormSchema } from './validation';
import { safeUrl } from './utils';

export type RecipeEditorStep = 'main' | 'method' | 'photos';
export const recipeEditorSteps: RecipeEditorStep[] = ['main', 'method', 'photos'];
export const recipeEditorTitles: Record<RecipeEditorStep, string> = {
  main: 'Main details',
  method: 'Ingredients & method',
  photos: 'Photos & source',
};
export interface RecipeFormValues {
  title: string;
  type: string;
  tags: string;
  servings: string;
  yield_label: string;
  time_label: string;
  intro: string;
  source_url: string;
  source_label: string;
  notion_url: string;
  ingredients_text: string;
  steps_text: string;
  notes: string;
}

export function recipeEditorFieldStep(field: string): RecipeEditorStep {
  if (['ingredients_text', 'steps_text', 'notes'].includes(field)) return 'method';
  if (['source_url', 'source_label'].includes(field)) return 'photos';
  return 'main';
}
export function recipeEditorIssue(form: RecipeFormValues, step?: RecipeEditorStep) {
  const validation = recipeFormSchema.safeParse(form);
  const issue = validation.success
    ? undefined
    : validation.error.issues.find(
        (item) => !step || recipeEditorFieldStep(String(item.path[0])) === step,
      );
  if (issue) return { step: recipeEditorFieldStep(String(issue.path[0])), message: issue.message };
  if (
    (!step || step === 'main') &&
    form.servings &&
    (!Number.isFinite(Number(form.servings)) || Number(form.servings) <= 0)
  )
    return { step: 'main' as const, message: 'Base servings must be greater than zero.' };
  if ((!step || step === 'photos') && form.source_url && !safeUrl(form.source_url))
    return { step: 'photos' as const, message: 'Use a complete http or https source URL.' };
}

const text = z.string().max(50000);
const importUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => !!safeUrl(value), 'Use an HTTP or HTTPS link.');
export const importedRecipeSchema = z.object({
  title: z.string().max(200),
  type: z.string().max(60),
  tags: z.array(z.string().max(10000)).max(20),
  servings: z.number().nullable(),
  yield_label: text.nullable(),
  time_label: text.nullable(),
  intro: text.nullable(),
  source_url: importUrl,
  source_label: text,
  ingredients_text: text,
  steps_text: text,
  notes: z.array(text).max(100),
  image_urls: z.array(importUrl).max(12),
});
export function applyRecipeImport(current: RecipeFormValues, data: unknown) {
  const parsed = importedRecipeSchema.safeParse(data);
  if (!parsed.success)
    throw new Error('Could not read this recipe. Try another link or enter it manually.');
  const recipe = parsed.data;
  return {
    form: {
      ...current,
      title: recipe.title,
      type: recipe.type,
      tags: recipe.tags.join(', '),
      servings: recipe.servings?.toString() ?? '',
      yield_label: recipe.yield_label ?? '',
      time_label: recipe.time_label ?? '',
      intro: recipe.intro ?? '',
      source_url: recipe.source_url,
      source_label: recipe.source_label,
      ingredients_text: recipe.ingredients_text,
      steps_text: recipe.steps_text,
      notes: recipe.notes.join('\n'),
    },
    images: recipe.image_urls,
  };
}
