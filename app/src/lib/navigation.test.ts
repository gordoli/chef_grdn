import { describe, expect, it } from 'vitest';
import { isDetailScreen, navigationSection } from './navigation';
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
describe('main navigation selection', () => {
  it('selects Recipes for initial root and recipe/utility route contexts', () => {
    for (const pathname of ['/', '', '/index', '/r/soup', '/favorites', '/basics', '/gallery'])
      expect(navigationSection(pathname)).toBe('/');
  });
  it('keeps Restaurants selected for collection, detail and roll routes in live and demo', () => {
    for (const path of ['/restaurants', '/restaurants/bandit', '/restaurants/bandit/', '/roll']) {
      expect(navigationSection(path)).toBe('/restaurants');
      expect(navigationSection(`/demo${path}`, '/demo')).toBe('/restaurants');
    }
    expect(navigationSection('/demo', '/demo')).toBe('/');
    expect(navigationSection('/demo/', '/demo')).toBe('/');
  });
});
