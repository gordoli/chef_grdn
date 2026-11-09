import { describe, expect, it } from 'vitest';
import { cookingTemperature, convertCookingMeasure } from './kitchenBasics';

describe('cooking conversions', () => {
  it('converts customary spoon and cup relationships', () => {
    expect(convertCookingMeasure(1, 'tbsp', 'tsp')).toBeCloseTo(3);
    expect(convertCookingMeasure(1, 'cup', 'tbsp')).toBeCloseTo(16);
    expect(convertCookingMeasure(1, 'cup', 'floz')).toBeCloseTo(8);
    expect(convertCookingMeasure(1, 'quart', 'cup')).toBeCloseTo(4);
    expect(convertCookingMeasure(0.5, 'cup', 'tbsp')).toBeCloseTo(8);
  });
  it('uses US customary volume and avoirdupois weight for metric conversions', () => {
    expect(convertCookingMeasure(1, 'cup', 'ml')).toBeCloseTo(236.5882365);
    expect(convertCookingMeasure(1, 'lb', 'oz')).toBeCloseTo(16);
    expect(convertCookingMeasure(1, 'oz', 'gram')).toBeCloseTo(28.349523125);
    expect(convertCookingMeasure(1000, 'gram', 'kg')).toBe(1);
    expect(convertCookingMeasure(0, 'tsp', 'ml')).toBe(0);
  });
  it('does not guess density or accept invalid amounts', () => {
    expect(convertCookingMeasure(1, 'cup', 'gram')).toBeNull();
    expect(convertCookingMeasure(1, 'oz', 'floz')).toBeNull();
    expect(convertCookingMeasure(-1, 'tbsp', 'tsp')).toBeNull();
    expect(convertCookingMeasure(NaN, 'tbsp', 'tsp')).toBeNull();
    expect(convertCookingMeasure(Infinity, 'tbsp', 'tsp')).toBeNull();
    expect(convertCookingMeasure(Number.MAX_VALUE, 'liter', 'tsp')).toBeNull();
  });
});

describe('temperature display', () => {
  it('converts and rounds the safe cooking thresholds consistently', () => {
    expect(cookingTemperature(145, 'F')).toBe('145°F');
    expect(cookingTemperature(145, 'C')).toBe('63°C');
    expect(cookingTemperature(160, 'C')).toBe('71°C');
    expect(cookingTemperature(165, 'C')).toBe('74°C');
    expect(cookingTemperature(32, 'C')).toBe('0°C');
  });
});
