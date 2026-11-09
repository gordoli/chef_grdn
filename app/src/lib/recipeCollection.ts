import type { CookingStatus, Recipe } from './types';

export const recipeTypes = [
  'Mains',
  'Appetizers',
  'Soups',
  'Sides',
  'Salads',
  'Breakfast',
  'Sauces',
  'Desserts',
  'Drinks',
] as const;

/** Display familiar category names without rewriting stored recipes. */
export function recipeTypeLabel(value: string): string {
  const name = value.trim();
  if (/^(?:starter|starters|appetizer|appetizers)$/i.test(name)) return 'Appetizers';
  if (/^(?:main|main dish|main course)$/i.test(name)) return 'Mains';
  if (/^soup$/i.test(name)) return 'Soups';
  return recipeTypes.find((type) => type.toLowerCase() === name.toLowerCase()) ?? (name || 'Other');
}

export function compareRecipeTypes(a: string, b: string): number {
  const labelA = recipeTypeLabel(a),
    labelB = recipeTypeLabel(b);
  const rank = (label: string) => {
    const index = recipeTypes.findIndex((type) => type === label);
    return index === -1 ? recipeTypes.length : index;
  };
  return rank(labelA) - rank(labelB) || labelA.localeCompare(labelB);
}

export function groupRecipesByType<T extends { type: string }>(
  recipes: readonly T[],
): { type: string; recipes: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const recipe of recipes) {
    const label = recipeTypeLabel(recipe.type);
    const group = groups.get(label) ?? [];
    group.push(recipe);
    groups.set(label, group);
  }
  return [...groups]
    .sort(([a], [b]) => compareRecipeTypes(a, b))
    .map(([type, items]) => ({ type, recipes: items }));
}

export function recipeCookingStatus(recipe: Pick<Recipe, 'cooking_status'>): CookingStatus {
  return recipe.cooking_status ?? 'made';
}
