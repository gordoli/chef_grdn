import { describe, expect, it } from 'vitest';
import seed from '../../seed/recipes.json';
import { formatItem, parseIngredientsText, parseLine, scaleItem, toText } from './quantity';
import { parseStepsText, stepsToText } from './recipeText';

const scalingCases = [
  [
    '4 salmon fillets (6–7 oz each), skin on',
    '8 salmon fillets (6–7 oz each), skin on',
    '2 salmon fillets (6–7 oz each), skin on',
  ],
  ['1–2 tbsp water, to loosen', '2–4 tbsp water, to loosen', '½–1 tbsp water, to loosen'],
  [
    '1 can (14.5 oz) diced tomatoes, with their juice',
    '2 cans (14.5 oz) diced tomatoes, with their juice',
    '½ can (14.5 oz) diced tomatoes, with their juice',
  ],
  ['~1½ tsp salt, then adjust', '~3 tsp salt, then adjust', '~¾ tsp salt, then adjust'],
  ['2 tsp–1 tbsp smoked paprika', '4 tsp–2 tbsp smoked paprika', '1 tsp–½ tbsp smoked paprika'],
  [
    '8.8 oz fresh pasta (or ~10 oz dried spaghetti)',
    '18 oz fresh pasta (or ~10 oz dried spaghetti)',
    '4.4 oz fresh pasta (or ~10 oz dried spaghetti)',
  ],
  ['½ lb lean ground beef', '1 lb lean ground beef', '¼ lb lean ground beef'],
  ['Kosher salt', 'Kosher salt', 'Kosher salt'],
  [
    '¼ inch ginger, sliced into chunks',
    '½ inch ginger, sliced into chunks',
    '⅛ inch ginger, sliced into chunks',
  ],
];

describe('portion scaling', () => {
  it.each(scalingCases)(
    'scales %s without changing parenthetical amounts',
    (raw, doubled, halved) => {
      expect(formatItem(scaleItem(parseLine(raw), 2))).toBe(doubled);
      expect(formatItem(scaleItem(parseLine(raw), 0.5))).toBe(halved);
      expect(formatItem(scaleItem(parseLine(raw), 1))).toBe(raw);
    },
  );

  it.each([
    ['2 tsp salt', 2],
    ['1.5 tsp salt', 1.5],
    ['1/2 tsp salt', 0.5],
    ['½ tsp salt', 0.5],
    ['¼ tsp salt', 0.25],
    ['¾ tsp salt', 0.75],
    ['⅓ tsp salt', 1 / 3],
    ['⅔ tsp salt', 2 / 3],
    ['⅛ tsp salt', 0.125],
    ['1 1/2 tsp salt', 1.5],
    ['1½ tsp salt', 1.5],
    ['1 ½ tsp salt', 1.5],
    ['about 1 tsp salt', 1],
    ['~1 tsp salt', 1],
  ])('parses the leading amount in %s', (raw, qty) => {
    expect(parseLine(raw).qty).toBe(qty);
  });

  it.each(['1–2 tbsp water', '1-2 tbsp water', '1 to 2 tbsp water'])('parses range %s', (raw) => {
    expect(parseLine(raw)).toMatchObject({ qty: 1, qty_max: 2, unit: 'tbsp', item: 'water' });
  });

  it('separates only the first comma outside parentheses', () => {
    expect(parseLine('1 can tomatoes (peeled, whole), with juice, divided')).toMatchObject({
      item: 'tomatoes (peeled, whole)',
      note: 'with juice, divided',
    });
  });

  it('preserves raw-only Claude items and invalid scale factors', () => {
    expect(formatItem(scaleItem({ raw: '3 tbsp miso' }, 2))).toBe('3 tbsp miso');
    for (const factor of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatItem(scaleItem(parseLine('3 tbsp miso'), factor))).toBe('3 tbsp miso');
    }
  });

  it('marks substantial rounding and keeps count quantities at least one half', () => {
    expect(formatItem(scaleItem(parseLine('1 egg'), 0.1))).toBe('≈½ egg');
    expect(formatItem(scaleItem(parseLine('1 tsp salt'), 0.2))).toBe('≈¼ tsp salt');
  });

  it('does not guess quantities for invalid or ambiguous leading amounts', () => {
    expect(parseLine('1/0 cup water').qty).toBeNull();
    expect(parseLine('1– tbsp water').qty).toBeNull();
    expect(parseLine('a pinch of salt').qty).toBeNull();
  });

  it('preserves exact thirds and does not convert units', () => {
    expect(formatItem(scaleItem(parseLine('⅓ cup milk'), 2))).toBe('⅔ cup milk');
    expect(formatItem(scaleItem(parseLine('4 tsp salt'), 2))).toBe('8 tsp salt');
  });
});

describe('seed recipe round trips', () => {
  for (const recipe of seed.recipes) {
    it(`preserves all ingredient lines and method sections for ${recipe.slug}`, () => {
      expect(toText(parseIngredientsText(recipe.ingredients_text))).toBe(recipe.ingredients_text);
      expect(stepsToText(parseStepsText(recipe.steps_text))).toBe(recipe.steps_text);
      for (const line of recipe.ingredients_text
        .split('\n')
        .filter((line) => !line.startsWith('## '))) {
        expect(formatItem(parseLine(line))).toBe(line);
        expect(() => formatItem(scaleItem(parseLine(line), 0.5))).not.toThrow();
        expect(() => formatItem(scaleItem(parseLine(line), 2))).not.toThrow();
      }
    });
  }

  it('scales the salmon from four servings to two', () => {
    const salmon = seed.recipes.find((recipe) => recipe.slug === 'miso-salmon');
    expect(salmon).toBeDefined();
    const ingredients = parseIngredientsText(salmon?.ingredients_text ?? '');
    const scaled = ingredients.flatMap((section) =>
      section.items.map((item) => formatItem(scaleItem(item, 0.5))),
    );
    expect(scaled.some((line) => line.startsWith('2 salmon fillets'))).toBe(true);
    expect(scaled.some((line) => line.startsWith('1½ tbsp white miso'))).toBe(true);
    expect(scaled.some((line) => line.startsWith('2 cups dashi'))).toBe(true);
  });

  it('handles empty section text', () => {
    expect(parseIngredientsText('')).toEqual([]);
    expect(parseStepsText('')).toEqual([]);
    expect(toText([])).toBe('');
    expect(stepsToText([])).toBe('');
  });
});
