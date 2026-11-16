import { load } from 'cheerio';
import { geocodeRestaurantAddress } from './restaurantGeocode';
import {
  emptyRestaurant,
  publicWebsite,
  restaurantSlug,
  type RestaurantInput,
} from '../src/lib/restaurants';
import { fetchRestaurantResource, RestaurantImportError } from './restaurantFetch';

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown, max = 500): string {
  return typeof value === 'string'
    ? load(`<body>${value}</body>`)('body').text().replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}
function findRestaurant(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    for (const child of value.slice(0, 300)) {
      const found = findRestaurant(child, depth + 1);
      if (found) return found;
    }
  } else if (record(value)) {
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (
      types.some(
        (type) =>
          typeof type === 'string' &&
          /(?:^|[/#])(?:Restaurant|FoodEstablishment|CafeOrCoffeeShop|BarOrPub|Bakery)$/.test(type),
      )
    )
      return value;
    for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'department', 'location']) {
      const found = findRestaurant(value[key], depth + 1);
      if (found) return found;
    }
  }
}
export function parseRestaurantHtml(html: string, source: string): RestaurantInput {
  const $ = load(html);
  let data: Record<string, unknown> = {};
  $('script[type="application/ld+json"]')
    .slice(0, 40)
    .each((_, script) => {
      if (data.name) return;
      try {
        data = findRestaurant(JSON.parse($(script).text())) ?? data;
      } catch {
        /* Other metadata can still supply the details. */
      }
    });
  const meta = (name: string) =>
    $(`meta[property="${name}"],meta[name="${name}"]`).first().attr('content') ?? '';
  const name = text(data.name, 200) || text(meta('og:title') || $('title').text(), 200);
  if (!name)
    throw new RestaurantImportError('No restaurant details were found. Enter the name manually.');
  const address = record(data.address)
    ? ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode']
        .map((key) => text((data.address as Record<string, unknown>)[key]))
        .filter(Boolean)
        .join(', ')
    : text(data.address);
  const geo = record(data.geo) ? data.geo : {};
  const coordinate = (value: unknown, max: number) => {
    const number =
      typeof value === 'number' || (typeof value === 'string' && value.trim())
        ? Number(value)
        : NaN;
    return Number.isFinite(number) && Math.abs(number) <= max ? number : null;
  };
  const latitude = coordinate(geo.latitude, 90);
  const longitude = coordinate(geo.longitude, 180);
  const images: string[] = [];
  const addImage = (value: unknown, depth = 0) => {
    if (depth > 5 || images.length >= 12) return;
    if (Array.isArray(value)) {
      value.slice(0, 12).forEach((child) => addImage(child, depth + 1));
      return;
    }
    if (record(value)) {
      addImage(value.url ?? value.contentUrl, depth + 1);
      return;
    }
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      /logo|icon|badge|pixel|avatar|stamp|removebg|best%2bof|best-of|award|screenshot|under[_-]construction|\/vip[.]|\/mail[.]|\/shop[.]|dummy|placeholder|\/plugins\//i.test(
        value,
      )
    )
      return;
    try {
      const url = new URL(value, source).href;
      if (publicWebsite(url) && !images.includes(url)) images.push(url);
    } catch {
      /* Ignore malformed images. */
    }
  };
  addImage(data.image);
  addImage(data.photo);
  addImage(meta('og:image'));
  addImage(meta('twitter:image'));
  $('img')
    .slice(0, 60)
    .each((_, image) => {
      const src =
        $(image).attr('data-lazyload') ||
        $(image).attr('data-src') ||
        $(image).attr('data-image') ||
        $(image).attr('src') ||
        $(image).attr('srcset')?.split(',')[0]?.trim().split(/\s+/)[0];
      if (
        src &&
        /\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(src) &&
        !/logo|icon|badge|pixel|avatar/i.test(src)
      )
        addImage(src);
    });
  $('[style]')
    .slice(0, 100)
    .each((_, element) => {
      const style = $(element).attr('style') ?? '';
      for (const match of style.matchAll(/url\(['"]?([^)'"]+)['"]?\)/g)) addImage(match[1]);
    });
  const phone =
    text(data.telephone, 80) || text($('a[href^="tel:"]').first().attr('href')?.slice(4), 80);
  return {
    ...emptyRestaurant,
    name,
    slug: restaurantSlug(name),
    website: source,
    cuisine: text(
      Array.isArray(data.servesCuisine) ? data.servesCuisine.join(', ') : data.servesCuisine,
      100,
    ),
    address: address || null,
    phone: phone || null,
    price_range: /^\$?\d+(?:\.\d{1,2})?\s*[-–]\s*\$?\d+(?:\.\d{1,2})?$/.test(
      text(data.priceRange, 50),
    )
      ? text(data.priceRange, 50)
      : null,
    latitude: longitude !== null ? latitude : null,
    longitude: latitude !== null ? longitude : null,
    photo_urls: images,
  };
}
const quotas = new Map<string, { start: number; count: number }>();
export async function handleRestaurantImport(
  request: Request,
  _fetcher: typeof fetch = fetch,
  identity = 'local',
): Promise<Response> {
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!request.headers.get('content-type')?.includes('application/json'))
    return json({ error: 'Send a JSON restaurant link.' }, 415);
  const now = Date.now();
  for (const [key, quota] of quotas) if (now - quota.start > 60000) quotas.delete(key);
  const quota = quotas.get(identity) ?? { start: now, count: 0 };
  if (quota.count >= 12 || (!quotas.has(identity) && quotas.size >= 500))
    return json({ error: 'Please try importing again in one minute.' }, 429);
  quota.count++;
  quotas.set(identity, quota);
  try {
    // Count streamed bytes rather than trusting Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Enter a restaurant link.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return json({ error: 'The link is too long.' }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return json({ error: 'Enter a valid restaurant link.' }, 400);
    }
    if (
      !record(body) ||
      typeof body.url !== 'string' ||
      body.url.length > 2048 ||
      !publicWebsite(body.url)
    )
      return json({ error: 'Enter a public HTTPS restaurant website link.' }, 400);
    const host = new URL(body.url).hostname.replace(/^www\./, '');
    if (['instagram.com', 'tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'].includes(host))
      return json(
        { error: 'Import the restaurant’s website. Save social video links in its Videos tab.' },
        422,
      );
    const resource = await fetchRestaurantResource(body.url);
    const imported = parseRestaurantHtml(resource.bytes.toString('utf8'), resource.url);
    const coordinates =
      imported.address && imported.latitude === null
        ? await geocodeRestaurantAddress(imported.address, _fetcher)
        : null;
    return json({ ...imported, ...coordinates });
  } catch (error) {
    return json(
      {
        error:
          error instanceof RestaurantImportError
            ? error.message
            : 'The website could not be reached. You can enter the restaurant manually.',
      },
      error instanceof RestaurantImportError ? error.status : 502,
    );
  }
}
