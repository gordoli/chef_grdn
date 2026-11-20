import { z } from 'zod';
import { publicWebsite } from './urls';
import type { RestaurantInput } from './restaurants';

export function canonicalYelpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!publicWebsite(url.href) || !['yelp.com', 'www.yelp.com'].includes(url.hostname))
      return null;
    const match = /^\/biz\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) return null;
    const alias = decodeURIComponent(match[1]);
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,199}$/u.test(alias)) return null;
    return `https://www.yelp.com/biz/${encodeURIComponent(alias)}`;
  } catch {
    return null;
  }
}
/** Mobile share links are accepted at import time; saved records keep the full business URL. */
export function canonicalYelpImportUrl(value: string): string | null {
  const input = value.trim().replace(/^(?=(?:www\.)?yelp\.(?:to|com)\/)/i, 'https://');
  const business = canonicalYelpUrl(input);
  if (business) return business;
  try {
    const url = new URL(input);
    if (
      publicWebsite(input) &&
      ['yelp.to', 'www.yelp.to'].includes(url.hostname) &&
      /^\/[A-Za-z0-9_-]{3,100}\/?$/.test(url.pathname)
    )
      return `https://yelp.to${url.pathname}`;
  } catch {
    /* Keep invalid input editable. */
  }
  return null;
}
export function yelpPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      publicWebsite(value) &&
      url.hostname.endsWith('.yelpcdn.com') &&
      url.pathname.startsWith('/bphoto/')
    );
  } catch {
    return false;
  }
}
const link = z.string().max(2048).refine(publicWebsite);
const sourceLink = link.refine((value) => canonicalYelpUrl(value) !== null);
export const yelpBusiness = z.object({
  url: sourceLink,
  business_id: z.string().max(200),
  name: z.string().min(1).max(200),
  fetched_at: z.iso.datetime(),
  address: z.string().max(500).nullable(),
  phone: z.string().max(80).nullable(),
  website: link.nullable(),
  categories: z.array(z.string().max(100)).max(10),
  hours: z
    .record(z.string().max(20), z.string().max(200))
    .refine((value) => Object.keys(value).length <= 7),
  price_tier: z
    .string()
    .regex(/^\${1,4}$/)
    .nullable(),
  rating: z.number().min(0).max(5).nullable(),
  review_count: z.number().int().min(0).max(10000000).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  description: z.string().max(3000),
  reviews: z
    .array(
      z.object({
        id: z.string().max(200),
        url: sourceLink,
        author: z.string().max(120),
        rating: z.number().min(0).max(5),
        date: z.string().max(100),
        text: z.string().max(8000),
        photos: z.array(link.refine(yelpPhotoUrl)).max(12),
      }),
    )
    .max(5),
});
export type YelpBusiness = z.infer<typeof yelpBusiness>;
export const yelpImportResult = z.object({
  business: yelpBusiness,
  warnings: z.array(z.string().max(300)).max(10),
});
export type YelpImportResult = z.infer<typeof yelpImportResult>;

/** Background photos enrich only the existing source gallery, preserving the edited form. */
export function mergeYelpReviewPhotos(
  previous: RestaurantInput,
  incoming: YelpBusiness,
): RestaurantInput {
  return {
    ...previous,
    yelp_data: previous.yelp_data.map((business) =>
      business.url === incoming.url
        ? { ...business, reviews: incoming.reviews, fetched_at: incoming.fetched_at }
        : business,
    ),
  };
}

export function yelpPhotos(businesses: YelpBusiness[]): string[] {
  return [...new Set(businesses.flatMap((b) => b.reviews.flatMap((r) => r.photos)))];
}
export function restaurantGalleryUrls(
  restaurant: Pick<RestaurantInput, 'photo_urls' | 'yelp_data' | 'thumbnail_url'>,
): string[] {
  return [
    ...new Set([
      ...restaurant.photo_urls,
      ...yelpPhotos(restaurant.yelp_data),
      ...(restaurant.thumbnail_url ? [restaurant.thumbnail_url] : []),
    ]),
  ];
}
export function restaurantPhotoUrls(
  restaurant: Pick<RestaurantInput, 'photo_urls' | 'yelp_data' | 'thumbnail_url'>,
): string[] {
  const gallery = restaurantGalleryUrls(restaurant);
  return restaurant.thumbnail_url
    ? [restaurant.thumbnail_url, ...gallery.filter((url) => url !== restaurant.thumbnail_url)]
    : gallery;
}
/** Only business fields are enriched. Personal fields and other locations remain authoritative. */
export function mergeYelpBusiness(
  previous: RestaurantInput,
  business: YelpBusiness,
  locationIndex = 0,
): RestaurantInput {
  const locations = previous.locations.length
    ? [...previous.locations]
    : [
        {
          neighborhood: previous.neighborhood ?? '',
          address: previous.address,
          phone: previous.phone,
          latitude: previous.latitude,
          longitude: previous.longitude,
        },
      ];
  if (!Number.isInteger(locationIndex) || locationIndex < 0 || locationIndex >= locations.length)
    throw new Error('Choose a saved location to update.');
  const location = locations[locationIndex];
  const address = business.address || location.address;
  const addressChanged = !!business.address && business.address !== location.address;
  locations[locationIndex] = {
    ...location,
    address,
    phone: business.phone || location.phone,
    latitude:
      business.latitude !== null && business.longitude !== null
        ? business.latitude
        : addressChanged
          ? null
          : location.latitude,
    longitude:
      business.latitude !== null && business.longitude !== null
        ? business.longitude
        : addressChanged
          ? null
          : location.longitude,
  };
  const yelp_data = [...previous.yelp_data.filter((b) => b.url !== business.url), business].slice(
    -12,
  );
  const first = locations[0];
  return {
    ...previous,
    name: previous.name || business.name,
    cuisine: previous.cuisine || business.categories.join(' / ').slice(0, 100),
    website: business.website || previous.website,
    yelp_url: locationIndex === 0 ? business.url : previous.yelp_url,
    locations,
    neighborhood: first.neighborhood || null,
    address: first.address,
    phone: first.phone,
    latitude: first.latitude,
    longitude: first.longitude,
    yelp_data,
  };
}
