import type { IngredientSection, Item } from './types';

const fractions: Record<string, number> = {
  '⅛': 1 / 8,
  '¼': 1 / 4,
  '⅜': 3 / 8,
  '½': 1 / 2,
  '⅝': 5 / 8,
  '¾': 3 / 4,
  '⅞': 7 / 8,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
};
const amountPattern = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?\s*[⅛¼⅜½⅝¾⅞⅓⅔]?|[⅛¼⅜½⅝¾⅞⅓⅔])/;
const unitPattern =
  /^(fl\s+oz|tsp|tbsp|cups?|oz|lbs?|g|kg|ml|l|pints?|quarts?|cloves?|cans?|slices?|bunch(?:es)?|pinch(?:es)?|inch(?:es)?)\b/i;
const rangePattern = /^(?:[–-]|to\b)\s*/i;

function readAmount(text: string): { value: number; rest: string } | null {
  const match = text.match(amountPattern);
  if (!match) return null;
  const token = match[0].trim();
  const vulgar = token.slice(-1);
  let value: number;
  if (vulgar in fractions) {
    value = Number(token.slice(0, -1).trim() || 0) + fractions[vulgar];
  } else if (token.includes('/')) {
    const parts = token.split(/\s+/);
    const [numerator, denominator] = parts[parts.length - 1].split('/').map(Number);
    value = numerator / denominator + (parts.length > 1 ? Number(parts[0]) : 0);
  } else {
    value = Number(token);
  }
  return Number.isFinite(value) && value > 0
    ? { value, rest: text.slice(match[0].length).trimStart() }
    : null;
}

function readUnit(text: string): { unit?: string; rest: string } {
  const match = text.match(unitPattern);
  return match ? { unit: match[0], rest: text.slice(match[0].length).trimStart() } : { rest: text };
}

function splitNote(text: string): { item: string; note?: string } {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '(') depth += 1;
    if (text[index] === ')') depth = Math.max(0, depth - 1);
    if (text[index] === ',' && depth === 0) {
      return { item: text.slice(0, index).trim(), note: text.slice(index + 1).trim() };
    }
  }
  return { item: text.trim() };
}

/** Only leading amounts are parsed, so parenthetical package sizes never scale. */
export function parseLine(raw: string): Item {
  let text = raw.trim();
  const approximation = text.match(/^(?:~|≈|about\s+)/i);
  if (approximation) text = text.slice(approximation[0].length).trimStart();
  const first = readAmount(text);
  if (!first) return { raw, qty: null, item: raw };
  let rest = first.rest;
  let unit: string | undefined;
  let unitMax: string | undefined;
  let qtyMax: number | undefined;
  const firstUnit = readUnit(rest);
  unit = firstUnit.unit;
  rest = firstUnit.rest;
  const separator = rest.match(rangePattern);
  if (separator) {
    const second = readAmount(rest.slice(separator[0].length));
    if (!second) return { raw, qty: null, item: raw };
    qtyMax = second.value;
    const lastUnit = readUnit(second.rest);
    if (unit) unitMax = lastUnit.unit;
    else unit = lastUnit.unit;
    rest = lastUnit.rest;
  }
  return {
    raw,
    qty: first.value,
    ...splitNote(rest),
    ...(unit ? { unit } : {}),
    ...(qtyMax !== undefined ? { qty_max: qtyMax } : {}),
    ...(unitMax ? { unit_max: unitMax } : {}),
    ...(approximation ? { approx: true } : {}),
  };
}

export function scaleItem(item: Item, factor: number): Item {
  if (item.qty == null || !Number.isFinite(factor) || factor <= 0 || factor === 1) return item;
  return {
    ...item,
    qty: item.qty * factor,
    ...(item.qty_max !== undefined ? { qty_max: item.qty_max * factor } : {}),
    scaled: true,
  };
}

function fractionalAmount(value: number): { text: string; rounded: number } {
  const whole = Math.floor(value);
  const fraction = value - whole;
  // Preserve exact thirds, which have familiar recipe glyphs but no exact eighth.
  const third = [1 / 3, 2 / 3].find((candidate) => Math.abs(fraction - candidate) < 0.00001);
  if (third !== undefined)
    return { text: `${whole || ''}${third < 0.5 ? '⅓' : '⅔'}`, rounded: value };
  const rounded = Math.round(value * 8) / 8;
  const glyphs = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];
  return {
    text: `${Math.floor(rounded) || (rounded === 0 ? '0' : '')}${glyphs[Math.round((rounded % 1) * 8)]}`,
    rounded,
  };
}

function formatAmount(value: number, unit?: string): { text: string; rounded: number } {
  const normalized = (unit ?? '')
    .toLowerCase()
    .replace(/^inches$/, 'inch')
    .replace(/s$/, '');
  if (['tsp', 'tbsp', 'cup', 'inch'].includes(normalized) || (normalized === 'lb' && value < 1)) {
    return fractionalAmount(value);
  }
  if (['oz', 'fl oz', 'lb', 'g', 'kg', 'ml', 'l'].includes(normalized)) {
    const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
    return { text: String(rounded), rounded };
  }
  const rounded = Math.max(0.5, Math.round(value * 2) / 2);
  return { ...fractionalAmount(rounded), rounded };
}

function displayUnit(unit: string | undefined, quantity: number): string {
  if (!unit) return '';
  const pairs: Record<string, [string, string]> = {
    can: ['can', 'cans'],
    cans: ['can', 'cans'],
    clove: ['clove', 'cloves'],
    cloves: ['clove', 'cloves'],
    slice: ['slice', 'slices'],
    slices: ['slice', 'slices'],
    cup: ['cup', 'cups'],
    cups: ['cup', 'cups'],
  };
  const pair = pairs[unit.toLowerCase()];
  return pair ? pair[quantity <= 1 ? 0 : 1] : unit;
}

export function formatItem(item: Item): string {
  if (!item.scaled || item.qty == null) return item.raw;
  const first = formatAmount(item.qty, item.unit);
  const second =
    item.qty_max === undefined ? undefined : formatAmount(item.qty_max, item.unit_max ?? item.unit);
  const isRounded =
    Math.abs(first.rounded - item.qty) / item.qty > 0.1 ||
    (second !== undefined &&
      item.qty_max !== undefined &&
      Math.abs(second.rounded - item.qty_max) / item.qty_max > 0.1);
  const prefix = item.approx ? '~' : isRounded ? '≈' : '';
  let amount = first.text;
  if (second) {
    amount += item.unit_max
      ? ` ${displayUnit(item.unit, item.qty)}–${second.text} ${displayUnit(item.unit_max, item.qty_max ?? 1)}`
      : `–${second.text}`;
  }
  if (!item.unit_max && item.unit) amount += ` ${displayUnit(item.unit, item.qty)}`;
  return `${prefix}${amount}${item.item ? ` ${item.item}` : ''}${item.note ? `, ${item.note}` : ''}`;
}

export function parseIngredientsText(text: string): IngredientSection[] {
  const sections: IngredientSection[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.trimStart().startsWith('## ')) {
      sections.push({ section: line.trim().slice(3).trim(), items: [] });
    } else {
      if (!sections.length) sections.push({ section: '', items: [] });
      sections[sections.length - 1].items.push(parseLine(line));
    }
  }
  return sections;
}

export function toText(sections: IngredientSection[]): string {
  return sections
    .flatMap(({ section, items }) => [
      ...(section ? [`## ${section}`] : []),
      ...items.map(({ raw }) => raw),
    ])
    .join('\n');
}
