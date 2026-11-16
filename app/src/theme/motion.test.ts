import { afterEach, describe, expect, it, vi } from 'vitest';
import { motionDurationMs } from './motion';

afterEach(() => vi.unstubAllGlobals());
describe('CSS motion timing', () => {
  it.each([
    ['4s', 4000],
    ['4000ms', 4000],
    [' 0.24s ', 240],
    ['', 0],
  ])('reads browser-normalized %s durations as %i milliseconds', (css, expected) => {
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => css }));
    expect(motionDurationMs({} as Element, '--motion-roll-duration')).toBe(expected);
  });
});
