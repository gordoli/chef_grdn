import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { surfacePalette } from './palette';
describe('cross-renderer theme colors', () => {
  it('keeps browser metadata and export colors aligned with CSS light/dark tokens', () => {
    const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
    for (const [selector, values] of [
      [':root', surfacePalette.light],
      ['.dark', surfacePalette.dark],
    ] as const) {
      const block = css.slice(css.indexOf(selector + ' {')).split('}')[0];
      for (const [token, value] of Object.entries(values)) {
        const name = token === 'muted' ? 'muted-foreground' : token;
        expect(block).toContain(`--${name}: ${value};`);
      }
    }
  });
});
