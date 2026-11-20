import { describe, expect, it, vi } from 'vitest';
import { canonicalYelpImportUrl } from '../src/lib/restaurantYelp';
import { resolveYelpImportUrl } from './restaurantYelpRedirect';
const full = 'https://www.yelp.com/biz/bangkok-street-thai-street-food-san-francisco-3';
describe('Yelp mobile shares', () => {
  it('accepts bare mobile shares and strips tracking from resolved business links', async () => {
    expect(canonicalYelpImportUrl('yelp.to/Vto2iptu_d')).toBe('https://yelp.to/Vto2iptu_d');
    const redirect = vi.fn().mockResolvedValue(full + '?uid=private-sharing-id&utm_source=ishare');
    expect(await resolveYelpImportUrl('yelp.to/Vto2iptu_d', redirect)).toBe(full);
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(await resolveYelpImportUrl(full, redirect)).toBe(full);
    expect(redirect).toHaveBeenCalledTimes(1);
  });
  it('refuses off-domain, credentialed and local redirects before following them', async () => {
    for (const bad of [
      'https://evil.org/biz/test',
      'http://yelp.com/biz/test',
      'https://localhost/biz/test',
      'https://user:secret@yelp.com/biz/test',
    ]) {
      const redirect = vi.fn().mockResolvedValue(bad);
      await expect(resolveYelpImportUrl('https://yelp.to/example', redirect)).rejects.toThrow(
        'could not be opened',
      );
      expect(redirect).toHaveBeenCalledTimes(1);
    }
    for (const bad of [
      'https://yelp.to.evil.org/code',
      'https://yelp.to:8443/code',
      'https://yelp.to/code/extra',
      'https://yelp.to/a%2Fb',
      'javascript:alert(1)',
    ])
      expect(canonicalYelpImportUrl(bad)).toBeNull();
  });
  it('bounds share redirect loops', async () => {
    const redirect = vi.fn().mockResolvedValue('https://yelp.to/loop');
    await expect(resolveYelpImportUrl('https://yelp.to/start', redirect)).rejects.toThrow(
      'could not be opened',
    );
    expect(redirect).toHaveBeenCalledTimes(4);
  });
});
