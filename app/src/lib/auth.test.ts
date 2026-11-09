import { describe, expect, it } from 'vitest';
import { passwordError, safeAuthDestination } from './auth';

describe('post-auth navigation', () => {
  it('preserves a local editor destination', () => {
    expect(safeAuthDestination('/r/miso-salmon/edit?tab=photos#cover')).toBe(
      '/r/miso-salmon/edit?tab=photos#cover',
    );
  });
  it.each([null, 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com'])(
    'rejects external or ambiguous destinations: %s',
    (value) => {
      expect(safeAuthDestination(value)).toBe('/');
    },
  );
});

describe('password setup', () => {
  it('requires matching passwords of a usable length without trimming them', () => {
    expect(passwordError('short', 'short')).toBeTruthy();
    expect(passwordError('a'.repeat(129), 'a'.repeat(129))).toBeTruthy();
    expect(passwordError('long enough', 'different password')).toBeTruthy();
    expect(passwordError(' a valid password ', ' a valid password ')).toBeNull();
  });
});
