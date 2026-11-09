export type TemperatureUnit = 'F' | 'C';
export function cookingTemperature(fahrenheit: number, unit: TemperatureUnit): string {
  const value = unit === 'F' ? fahrenheit : (fahrenheit - 32) * (5 / 9);
  return `${Math.round(value)}°${unit}`;
}

export const safeTemperatures = [
  {
    food: 'Steaks, chops & roasts',
    detail: 'Beef, pork, lamb & veal',
    fahrenheit: 145,
    rest: 'Rest 3 minutes',
  },
  {
    food: 'Ground meat',
    detail: 'Beef, pork, lamb & veal',
    fahrenheit: 160,
    rest: 'No rest required',
  },
  {
    food: 'Chicken & turkey',
    detail: 'Whole birds, pieces & ground poultry',
    fahrenheit: 165,
    rest: 'Check several places',
  },
  {
    food: 'Fish',
    detail: 'Whole fish & fillets',
    fahrenheit: 145,
    rest: 'Check the thickest part',
  },
  {
    food: 'Leftovers & casseroles',
    detail: 'Reheat all the way through',
    fahrenheit: 165,
    rest: 'Check the center',
  },
] as const;

// Culinary finish temperatures, separate from USDA minimum cooking guidance.
export const steakDoneness = [
  { name: 'Rare', fahrenheit: 125, center: 'Cool red center', color: '#b75862' },
  { name: 'Medium rare', fahrenheit: 130, center: 'Warm red center', color: '#ca7c82' },
  { name: 'Medium', fahrenheit: 140, center: 'Warm pink center', color: '#d8a099' },
  { name: 'Medium well', fahrenheit: 150, center: 'A little pink', color: '#ba9681' },
  { name: 'Well done', fahrenheit: 160, center: 'Little or no pink', color: '#907a69' },
] as const;

// US customary volume in mL; avoirdupois weight in grams. Never mix dimensions.
export const cookingUnits = {
  tsp: { label: 'Teaspoons (tsp)', short: 'tsp', kind: 'volume', factor: 4.92892159375 },
  tbsp: { label: 'Tablespoons (tbsp)', short: 'tbsp', kind: 'volume', factor: 14.78676478125 },
  cup: { label: 'US cups', short: 'cups', kind: 'volume', factor: 236.5882365 },
  floz: { label: 'US fluid ounces (fl oz)', short: 'fl oz', kind: 'volume', factor: 29.5735295625 },
  pint: { label: 'US pints', short: 'pints', kind: 'volume', factor: 473.176473 },
  quart: { label: 'US quarts', short: 'quarts', kind: 'volume', factor: 946.352946 },
  ml: { label: 'Milliliters (mL)', short: 'mL', kind: 'volume', factor: 1 },
  liter: { label: 'Liters (L)', short: 'L', kind: 'volume', factor: 1000 },
  gram: { label: 'Grams (g)', short: 'g', kind: 'weight', factor: 1 },
  kg: { label: 'Kilograms (kg)', short: 'kg', kind: 'weight', factor: 1000 },
  oz: { label: 'Ounces (oz)', short: 'oz', kind: 'weight', factor: 28.349523125 },
  lb: { label: 'Pounds (lb)', short: 'lb', kind: 'weight', factor: 453.59237 },
} as const;
export type CookingUnit = keyof typeof cookingUnits;
export type MeasureKind = 'volume' | 'weight';
export function convertCookingMeasure(
  amount: number,
  from: CookingUnit,
  to: CookingUnit,
): number | null {
  if (!Number.isFinite(amount) || amount < 0 || cookingUnits[from].kind !== cookingUnits[to].kind)
    return null;
  const result = amount * (cookingUnits[from].factor / cookingUnits[to].factor);
  return Number.isFinite(result) ? result : null;
}
