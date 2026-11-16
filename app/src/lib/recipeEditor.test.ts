import { describe, expect, it } from 'vitest';
import { applyRecipeImport, recipeEditorIssue, type RecipeFormValues } from './recipeEditor';
import { parseIngredientsText, toText } from './quantity';
import { parseStepsText, stepsToText } from './recipeText';

const form: RecipeFormValues = {
  title: 'Miso soup',
  type: 'Soups',
  tags: '',
  servings: '4',
  yield_label: '',
  time_label: '',
  intro: '',
  source_url: '',
  source_label: '',
  notion_url: 'https://notion.so/original',
  ingredients_text: '## Broth\n2 cups water\n1 tbsp miso',
  steps_text: '## Cook\nWarm the broth.\nWhisk in miso.',
  notes: '',
};
const imported = {
  title: 'Imported soup',
  type: 'Soups',
  tags: ['Miso', 'Quick'],
  servings: null,
  yield_label: null,
  time_label: '15 min',
  intro: null,
  source_url: 'https://www.seriouseats.com/soup',
  source_label: 'Serious Eats',
  ingredients_text: form.ingredients_text,
  steps_text: form.steps_text,
  notes: ['Do not boil.'],
  image_urls: ['https://www.seriouseats.com/soup.jpg'],
};
describe('Recipe sheet preparation', () => {
  it('validates the current step without requiring later steps yet', () => {
    const draft = { ...form, ingredients_text: '', steps_text: '' };
    expect(recipeEditorIssue(draft, 'main')).toBeUndefined();
    expect(recipeEditorIssue(draft, 'method')?.step).toBe('method');
    expect(recipeEditorIssue({ ...draft, title: '' }, 'main')?.step).toBe('main');
    expect(recipeEditorIssue(draft)?.step).toBe('method');
  });
  it('routes invalid servings and source URLs to the owning step before saving', () => {
    expect(recipeEditorIssue({ ...form, servings: 'NaN' })?.step).toBe('main');
    expect(recipeEditorIssue({ ...form, servings: '0' }, 'main')?.step).toBe('main');
    expect(recipeEditorIssue({ ...form, source_url: 'javascript:alert(1)' })?.step).toBe('photos');
    expect(recipeEditorIssue(form)).toBeUndefined();
  });
  it('validates imported fields and preserves recipe text, source attribution, and legacy links', () => {
    const snapshot = JSON.stringify(form);
    const result = applyRecipeImport(form, imported);
    expect(result.form.notion_url).toBe(form.notion_url);
    expect(result.form.source_url).toBe(imported.source_url);
    expect(result.form.tags).toBe('Miso, Quick');
    expect(result.form.servings).toBe('');
    expect(result.form.notes).toBe('Do not boil.');
    expect(toText(parseIngredientsText(result.form.ingredients_text))).toBe(form.ingredients_text);
    expect(stepsToText(parseStepsText(result.form.steps_text))).toBe(form.steps_text);
    expect(result.images).toEqual(imported.image_urls);
    expect(JSON.stringify(form)).toBe(snapshot);
  });
  it('rejects malformed import payloads and non-web image links', () => {
    expect(() => applyRecipeImport(form, { ...imported, tags: 'Miso' })).toThrow();
    expect(() =>
      applyRecipeImport(form, { ...imported, image_urls: ['javascript:alert(1)'] }),
    ).toThrow();
    expect(() =>
      applyRecipeImport(form, { ...imported, image_urls: Array(13).fill(imported.image_urls[0]) }),
    ).toThrow();
  });
});
