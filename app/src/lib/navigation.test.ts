import { describe, expect, it } from 'vitest';
import { isDetailScreen } from './navigation';
describe('detail-screen navigation', () => {
  it('hides global chrome on individual recipe, editor, and restaurant screens', () => {
    for (const path of [
      '/r/soup',
      '/r/soup/edit',
      '/restaurants/bandit',
      '/restaurants/dumpling-story/',
    ])
      expect(isDetailScreen(path)).toBe(true);
  });
  it('preserves collection and utility navigation', () => {
    for (const path of ['/', '/restaurants', '/gallery', '/favorites', '/basics', '/roll', '/new'])
      expect(isDetailScreen(path)).toBe(false);
  });
});
