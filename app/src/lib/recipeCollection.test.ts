import { describe, expect, it } from 'vitest';
import {
  compareRecipeTypes,
  groupRecipesByType,
  recipeTypeLabel,
  recipeCookingStatus,
} from './recipeCollection';
import { previewRecipesSchema } from './validation';
import seed from '../../seed/recipes.json';

describe('recipe cooking status', () => {
  it('treats legacy recipes as made without changing their JSON', () => {
    const legacy = {};
    expect(recipeCookingStatus(legacy)).toBe('made');
    expect(legacy).toEqual({});
    expect(recipeCookingStatus({ cooking_status: 'to_try' })).toBe('to_try');
  });
  it('preserves made and to-try states across preview persistence, rejecting invalid input', () => {
    const legacy = {
      ...seed.recipes[0],
      id: 'preview-0',
      ingredients: [],
      steps: [],
      photos: [],
      cover_photo_id: null,
      created_at: '',
      updated_at: '',
    };
    expect(previewRecipesSchema.parse([legacy])[0].cooking_status).toBe('made');
    for (const cooking_status of ['made', 'to_try']) {
      const saved = JSON.stringify([{ ...legacy, cooking_status }]);
      expect(previewRecipesSchema.parse(JSON.parse(saved))[0].cooking_status).toBe(cooking_status);
    }
    expect(previewRecipesSchema.safeParse([{ ...legacy, cooking_status: 'unknown' }]).success).toBe(
      false,
    );
  });
});

describe('recipe type sections', () => {
  it('puts mains, appetizers and soups first and keeps recipe order within a section', () => {
    const input = [
      { id: 'soup', type: 'Soups' },
      { id: 'main-1', type: 'Mains' },
      { id: 'side', type: 'Sides' },
      { id: 'starter', type: 'Starters' },
      { id: 'main-2', type: 'Mains' },
    ];
    const groups = groupRecipesByType(input);
    expect(groups.map((group) => group.type)).toEqual(['Mains', 'Appetizers', 'Soups', 'Sides']);
    expect(groups[0].recipes.map((recipe) => recipe.id)).toEqual(['main-1', 'main-2']);
    expect(input[0].id).toBe('soup');
  });
  it('combines equivalent category labels without changing saved values', () => {
    const input = [{ type: 'Starters' }, { type: 'Appetizers' }, { type: 'appetizer' }];
    expect(groupRecipesByType(input)).toEqual([{ type: 'Appetizers', recipes: input }]);
    expect(recipeTypeLabel(' Main Dish ')).toBe('Mains');
    expect(recipeTypeLabel('soup')).toBe('Soups');
    expect(input[0].type).toBe('Starters');
  });
  it('keeps custom categories, sorted after the standard types', () => {
    expect(['Lunch', 'Mains', 'Bread', 'Soups'].sort(compareRecipeTypes)).toEqual([
      'Mains',
      'Soups',
      'Bread',
      'Lunch',
    ]);
    expect(recipeTypeLabel('  Bread  ')).toBe('Bread');
  });
  it('omits empty sections for filtered or empty collections', () => {
    expect(groupRecipesByType([])).toEqual([]);
    expect(groupRecipesByType([{ type: 'Soups' }]).map((group) => group.type)).toEqual(['Soups']);
  });
});
