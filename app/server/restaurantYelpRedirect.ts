import { socialImportPolicy } from '../src/config/loading';
import { canonicalYelpImportUrl, canonicalYelpUrl } from '../src/lib/restaurantYelp';
import { fetchRestaurantRedirect, RestaurantImportError } from './restaurantFetch';

export async function resolveYelpImportUrl(
  value: string,
  redirect = fetchRestaurantRedirect,
): Promise<string> {
  let current = canonicalYelpImportUrl(value);
  if (!current) throw new RestaurantImportError('Paste a Yelp business or share link.', 400);
  const signal = AbortSignal.timeout(socialImportPolicy.linkTimeoutMs);
  try {
    for (let hop = 0; hop <= socialImportPolicy.maxYelpRedirects; hop++) {
      const business = canonicalYelpUrl(current);
      if (business) return business;
      if (hop === socialImportPolicy.maxYelpRedirects) break;
      const location = await redirect(current, signal);
      if (!location) break;
      const next = canonicalYelpImportUrl(new URL(location, current).href);
      if (!next) break;
      current = next;
    }
  } catch (error) {
    if (signal.aborted)
      throw new RestaurantImportError('Yelp took too long to open the share link. Try again.', 504);
    if (error instanceof RestaurantImportError) throw error;
  }
  throw new RestaurantImportError(
    'This Yelp share link could not be opened. Check the link and try again.',
    422,
  );
}
