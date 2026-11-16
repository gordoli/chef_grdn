import { socialImportPolicy } from '../src/config/loading';
import { canonicalTikTokImportUrl } from '../src/lib/restaurantTikTok';
import { restaurantVideo } from '../src/lib/restaurants';
import { fetchRestaurantRedirect, RestaurantImportError } from './restaurantFetch';

/** Expand only supported TikTok links, then bind the job to the resolved video ID. */
export async function resolveTikTokImportUrl(
  value: string,
  redirect = fetchRestaurantRedirect,
): Promise<string> {
  let current = canonicalTikTokImportUrl(value);
  if (!current) throw new RestaurantImportError('Paste a TikTok video link.', 400);
  const signal = AbortSignal.timeout(socialImportPolicy.linkTimeoutMs);
  try {
    for (let hop = 0; hop <= socialImportPolicy.maxTikTokRedirects; hop++) {
      if (restaurantVideo(current)?.provider === 'TikTok') return current;
      if (hop === socialImportPolicy.maxTikTokRedirects) break;
      const location = await redirect(current, signal);
      if (!location) break;
      const next = canonicalTikTokImportUrl(new URL(location, current).href);
      if (!next) break;
      current = next;
    }
  } catch (error) {
    if (signal.aborted)
      throw new RestaurantImportError(
        'TikTok took too long to open the shared link. Try again.',
        504,
      );
    if (error instanceof RestaurantImportError) throw error;
  }
  throw new RestaurantImportError(
    'This TikTok shared link could not be opened. Open it in TikTok and copy the full video link.',
    422,
  );
}
