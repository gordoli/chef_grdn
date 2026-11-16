import { socialImportPolicy } from '../src/config/loading';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { publicWebsite } from '../src/lib/urls';
import { canonicalYelpUrl, yelpBusiness, type YelpBusiness } from '../src/lib/restaurantYelp';
import {
  canonicalTikTokImportUrl,
  tikTokImportResult,
  tikTokCaptionDetails,
} from '../src/lib/restaurantTikTok';
import { RestaurantImportError } from './restaurantFetch';
import { resolveTikTokImportUrl } from './restaurantTikTok';

const BUSINESS = 'gd_lgugwl0519h1p14rwk';
const REVIEWS = 'gd_lgzhlu9323u3k24jkv';
const snapshots = z.string().regex(/^sd_[A-Za-z0-9_-]{1,100}$/);
const job = z.object({
  source: z.enum(['yelp', 'tiktok']).default('yelp'),
  owner: z.string().max(100),
  url: z.string().max(2048),
  business: snapshots,
  reviews: snapshots.nullable(),
  expires: z.number(),
  warning: z.string().max(300),
});
const plain = (value: unknown, max = 500) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
function key(): string {
  const value = process.env.BRIGHTDATA_API_KEY;
  if (!value) throw new RestaurantImportError('Restaurant import is not configured yet.', 503);
  return value;
}
/** Fixed-origin requests never forward credentials to redirects or caller-provided hosts. */
export async function brightDataRequest(
  path: string,
  body?: unknown,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  if (!/^\/(?:datasets\/v3\/(?:trigger\?|progress\/sd_|snapshot\/sd_))/.test(path))
    throw new Error('Invalid Bright Data operation.');
  let response: Response;
  try {
    response = await fetcher(`https://api.brightdata.com${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${key()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(socialImportPolicy.providerTimeoutMs),
    });
  } catch (error) {
    if (error instanceof RestaurantImportError) throw error;
    throw new RestaurantImportError('Bright Data could not be reached. Try again later.', 502);
  }
  if (!response.ok) {
    if ([401, 403].includes(response.status))
      throw new RestaurantImportError(
        'Bright Data access was denied. Check the server API key and scraper permissions.',
        503,
      );
    if (response.status === 429)
      throw new RestaurantImportError(
        'Bright Data is busy. Wait a minute before trying again.',
        429,
      );
    if (response.status === 402)
      throw new RestaurantImportError(
        'Bright Data needs account attention. Check its dashboard before continuing.',
        503,
      );
    throw new RestaurantImportError(
      'Bright Data could not complete this request. Check its dashboard or try again later.',
      502,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new RestaurantImportError('Bright Data returned an empty response.', 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > socialImportPolicy.maxProviderBytes) {
        await reader.cancel();
        throw new RestaurantImportError('Bright Data returned too much data.', 502);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    if (error instanceof RestaurantImportError) throw error;
    throw new RestaurantImportError('Bright Data returned an unreadable response.', 502);
  } finally {
    reader.releaseLock();
  }
}
export async function startYelpCollection(
  url: string,
  kind: 'business' | 'reviews',
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const canonical = canonicalYelpUrl(url);
  if (!canonical)
    throw new RestaurantImportError(
      'Paste a full Yelp business link, like yelp.com/biz/restaurant-name.',
      400,
    );
  const limit = kind === 'business' ? 1 : 5;
  const result = await brightDataRequest(
    `/datasets/v3/trigger?dataset_id=${kind === 'business' ? BUSINESS : REVIEWS}&format=json&include_errors=true&notify=false&limit_per_input=${limit}&limit_multiple_results=${limit}`,
    {
      input: [{ url: canonical, ...(kind === 'reviews' ? { unrecommended_reviews: false } : {}) }],
      limit_per_input: limit,
    },
    fetcher,
  );
  const parsed = snapshots.safeParse(record(result).snapshot_id);
  if (!parsed.success)
    throw new RestaurantImportError('Bright Data did not start the import.', 502);
  return parsed.data;
}
export async function startTikTokCollection(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const canonical = canonicalTikTokImportUrl(url);
  if (!canonical) throw new RestaurantImportError('Paste a TikTok video link.', 400);
  const result = await brightDataRequest(
    '/datasets/v3/trigger?dataset_id=gd_lu702nij2f790tmv9h&format=json&include_errors=true&notify=false&limit_per_input=1&limit_multiple_results=1',
    { input: [{ url: canonical }], limit_per_input: 1 },
    fetcher,
  );
  const parsed = snapshots.safeParse(record(result).snapshot_id);
  if (!parsed.success)
    throw new RestaurantImportError('Bright Data did not start the import.', 502);
  return parsed.data;
}
export function parseTikTokImport(value: unknown, source: string) {
  const raw = record(value);
  const canonical = canonicalTikTokImportUrl(source);
  const video = canonicalTikTokImportUrl(plain(raw.url, 2048));
  if (
    !canonical ||
    !video ||
    !/\/@[\w.-]+\/video\/\d{10,25}$/.test(new URL(video).pathname) ||
    raw.error
  )
    throw new RestaurantImportError(
      'This TikTok video could not be imported. Check the link or enter the details manually.',
      422,
    );
  const expectedId = /\/video\/(\d+)$/.exec(canonical)?.[1];
  if (expectedId && /\/video\/(\d+)$/.exec(video)?.[1] !== expectedId)
    throw new RestaurantImportError('TikTok returned a different video. Check the link.', 422);
  const inputUrl = plain(record(raw.input).url, 2048);
  if (inputUrl && canonicalTikTokImportUrl(inputUrl) !== canonical)
    throw new RestaurantImportError('TikTok returned a different video. Check the link.', 422);
  const caption = plain(raw.description, 10000);
  return tikTokImportResult.parse({
    video_url: video,
    caption,
    author: plain(raw.profile_username, 120),
    ...tikTokCaptionDetails(caption),
  });
}
async function collectionReady(id: string, fetcher: typeof fetch): Promise<boolean> {
  snapshots.parse(id);
  const progress = record(
    await brightDataRequest(`/datasets/v3/progress/${id}`, undefined, fetcher),
  );
  if (['starting', 'running'].includes(String(progress.status))) return false;
  if (progress.status !== 'ready')
    throw new RestaurantImportError(
      'This collection failed. Try another link or enter the details manually.',
      422,
    );
  return true;
}
async function collectionSnapshot(
  id: string,
  limit: number,
  fetcher: typeof fetch,
): Promise<unknown[] | null> {
  const data = await brightDataRequest(
    `/datasets/v3/snapshot/${id}?format=json`,
    undefined,
    fetcher,
  );
  // A ready collection can still be assembling its downloadable snapshot.
  if (['building', 'starting', 'running'].includes(String(record(data).status))) return null;
  if (!Array.isArray(data) || data.length > limit)
    throw new RestaurantImportError('Bright Data returned an unexpected number of results.', 502);
  return data;
}
export async function readSocialCollection(
  id: string,
  limit: number,
  fetcher: typeof fetch = fetch,
): Promise<unknown[] | null> {
  return (await collectionReady(id, fetcher)) ? collectionSnapshot(id, limit, fetcher) : null;
}
export function parseYelpBusiness(
  value: unknown,
  reviews: unknown[],
  source: string,
  now = new Date().toISOString(),
): YelpBusiness {
  const raw = record(value);
  const url = canonicalYelpUrl(source);
  if (!url || canonicalYelpUrl(plain(raw.url, 2048)) !== url || !plain(raw.name, 200) || raw.error)
    throw new RestaurantImportError('No matching restaurant was returned for this Yelp link.', 422);
  const finite = (v: unknown, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? v : null;
  const lat = finite(raw.latitude, 90),
    lng = finite(raw.longitude, 180);
  const hours: Record<string, string> = {};
  for (const [day, text] of Object.entries(record(raw.opening_hours)).slice(0, 7))
    if (typeof text === 'string') hours[day.slice(0, 20)] = plain(text, 200);
  const website = plain(raw.website, 2048);
  const parsedReviews = reviews.slice(0, 5).flatMap((value) => {
    const review = record(value);
    if (
      review.error ||
      canonicalYelpUrl(plain(review.url, 2048)) !== url ||
      typeof review.Rating !== 'number' ||
      review.Rating < 0 ||
      review.Rating > 5
    )
      return [];
    const id = plain(review.review_id, 200);
    const photos = Array.isArray(review.Review_image)
      ? review.Review_image.filter((p): p is string => typeof p === 'string')
          .filter((p) => {
            try {
              const u = new URL(p);
              return (
                publicWebsite(p) &&
                u.hostname.endsWith('.yelpcdn.com') &&
                u.pathname.startsWith('/bphoto/')
              );
            } catch {
              return false;
            }
          })
          .slice(0, 12)
      : [];
    return [
      {
        id,
        url: id ? `${url}?hrid=${encodeURIComponent(id)}` : url,
        author:
          plain(
            record(review.Review_auther).name ??
              record(review.Review_auther).Username ??
              record(review.Review_auther).display_name ??
              review.Review_auther,
            120,
          ) || 'Yelp reviewer',
        rating: review.Rating,
        date: plain(review.date_iso_format ?? review.Date, 100),
        text: plain(review.Content, 8000),
        photos: [...new Set(photos)],
      },
    ];
  });
  return yelpBusiness.parse({
    url,
    business_id: plain(raw.yelp_biz_id ?? raw.business_id, 200),
    name: plain(raw.name, 200),
    fetched_at: now,
    address: plain(raw.full_address, 500) || null,
    phone: plain(raw.phone_number, 80) || null,
    website: website && publicWebsite(website) ? website : null,
    categories: Array.isArray(raw.categories)
      ? raw.categories
          .filter((s): s is string => typeof s === 'string')
          .slice(0, 10)
          .map((s) => plain(s, 100))
      : [],
    hours,
    price_tier:
      typeof raw.price_range === 'string' && /^\${1,4}$/.test(raw.price_range)
        ? raw.price_range
        : null,
    rating:
      typeof raw.overall_rating === 'number' && raw.overall_rating >= 0 && raw.overall_rating <= 5
        ? raw.overall_rating
        : null,
    review_count:
      typeof raw.reviews_count === 'number' &&
      Number.isInteger(raw.reviews_count) &&
      raw.reviews_count >= 0 &&
      raw.reviews_count <= 10000000
        ? raw.reviews_count
        : null,
    latitude: lng === null ? null : lat,
    longitude: lat === null ? null : lng,
    description: plain(raw.about_the_business ?? raw.from_the_business, 3000),
    reviews: parsedReviews,
  });
}
function seal(value: z.infer<typeof job>): string {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', key()).update(payload).digest('base64url')}`;
}
function unseal(ticket: string, owner: string): z.infer<typeof job> {
  const [payload, signature, ...rest] = ticket.split('.');
  if (!payload || !signature || rest.length)
    throw new RestaurantImportError('This import link is invalid. Start a new import.', 400);
  const expected = createHmac('sha256', key()).update(payload).digest();
  const supplied = Buffer.from(signature, 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
    throw new RestaurantImportError('This import link is invalid. Start a new import.', 400);
  let parsed: z.infer<typeof job>;
  try {
    parsed = job.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
  } catch {
    throw new RestaurantImportError('This import link is invalid. Start a new import.', 400);
  }
  if (parsed.owner !== owner)
    throw new RestaurantImportError('This import belongs to another session.', 403);
  if (parsed.expires < Date.now())
    throw new RestaurantImportError('This import expired. Start again.', 410);
  return parsed;
}
const quotas = new Map<string, { start: number; count: number }>();
export async function handleSocialImport(
  request: Request,
  fetcher: typeof fetch = fetch,
  owner = 'local',
  source: 'yelp' | 'tiktok' = 'yelp',
): Promise<Response> {
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    if (!request.headers.get('content-type')?.includes('application/json'))
      return json({ error: 'Send a JSON restaurant link.' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Enter a restaurant link.' }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > socialImportPolicy.maxRequestBytes) {
          await reader.cancel();
          return json({ error: 'The request is too long.' }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return json({ error: 'Send a valid restaurant import request.' }, 400);
    }
    const parsed = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('start'), url: z.string().max(2048) }),
        z.object({ action: z.literal('poll'), ticket: z.string().max(4096) }),
      ])
      .safeParse(input);
    if (!parsed.success) return json({ error: 'Send a valid restaurant import request.' }, 400);
    const now = Date.now();
    for (const [id, q] of quotas)
      if (now - q.start >= socialImportPolicy.quotaWindowMs) quotas.delete(id);
    const id = `${owner}:${source}:${parsed.data.action}`;
    const quota = quotas.get(id) ?? { start: now, count: 0 };
    if (
      quota.count >=
        (parsed.data.action === 'start'
          ? socialImportPolicy.maxStartRequests
          : socialImportPolicy.maxPollRequests) ||
      (!quotas.has(id) && quotas.size >= socialImportPolicy.maxQuotaEntries)
    )
      return json({ error: 'Please wait a minute before trying again.' }, 429);
    quotas.set(id, { ...quota, count: quota.count + 1 });
    if (parsed.data.action === 'start') {
      let url =
        source === 'yelp'
          ? canonicalYelpUrl(parsed.data.url)
          : canonicalTikTokImportUrl(parsed.data.url);
      if (!url)
        return json(
          {
            error:
              source === 'yelp'
                ? 'Paste a full Yelp business link, like yelp.com/biz/restaurant-name.'
                : 'Paste a TikTok video link.',
          },
          400,
        );
      if (source === 'tiktok') url = await resolveTikTokImportUrl(url);
      const business =
        source === 'yelp'
          ? await startYelpCollection(url, 'business', fetcher)
          : await startTikTokCollection(url, fetcher);
      let reviews: string | null = null;
      let warning = '';
      try {
        if (source === 'yelp') reviews = await startYelpCollection(url, 'reviews', fetcher);
      } catch {
        warning = 'Review photos could not be requested. You can add photos manually.';
      }
      return json(
        {
          ticket: seal({
            source,
            owner,
            url,
            business,
            reviews,
            expires: now + socialImportPolicy.ticketLifetimeMs,
            warning,
          }),
          status: 'running',
        },
        202,
      );
    }
    const current = unseal(parsed.data.ticket, owner);
    if (current.source !== source)
      throw new RestaurantImportError('This import belongs to a different source.', 400);
    if (source === 'tiktok') {
      const businesses = await readSocialCollection(current.business, 1, fetcher);
      if (!businesses) return json({ status: 'running' }, 202);
      return json(parseTikTokImport(businesses[0], current.url));
    }
    let warning = current.warning;
    // Poll cheap progress endpoints together. Download neither payload until both jobs are done.
    const [businessStatus, reviewStatus] = await Promise.allSettled([
      collectionReady(current.business, fetcher),
      current.reviews ? collectionReady(current.reviews, fetcher) : Promise.resolve(true),
    ]);
    if (businessStatus.status === 'rejected') throw businessStatus.reason;
    if (reviewStatus.status === 'rejected')
      warning = 'Reviews could not be loaded. You can add photos manually.';
    if (!businessStatus.value || (reviewStatus.status === 'fulfilled' && !reviewStatus.value))
      return json({ status: 'running' }, 202);
    const [businesses, reviews] = await Promise.all([
      collectionSnapshot(current.business, 1, fetcher),
      current.reviews && reviewStatus.status === 'fulfilled'
        ? collectionSnapshot(current.reviews, socialImportPolicy.maxReviews, fetcher).catch(() => {
            warning = 'Reviews could not be loaded. You can add photos manually.';
            return [];
          })
        : Promise.resolve([]),
    ]);
    if (!businesses || reviews === null) return json({ status: 'running' }, 202);
    const business = parseYelpBusiness(businesses[0], reviews, current.url);
    const warnings = [
      warning,
      !business.website ? 'Website was not returned. Add it below if you have it.' : '',
      !business.reviews.some((r) => r.photos.length)
        ? 'No review photos were returned. You can add photo links below.'
        : '',
      business.price_tier
        ? `Yelp reports ${business.price_tier}. Enter a numeric price range if you know it.`
        : '',
    ].filter(Boolean);
    return json({ business, warnings });
  } catch (error) {
    return json(
      {
        error:
          error instanceof RestaurantImportError
            ? error.message
            : 'Import could not be completed. You can enter the details manually.',
      },
      error instanceof RestaurantImportError ? error.status : 502,
    );
  }
}
export function handleTikTokImport(
  request: Request,
  fetcher: typeof fetch = fetch,
  owner = 'local',
) {
  return handleSocialImport(request, fetcher, owner, 'tiktok');
}
