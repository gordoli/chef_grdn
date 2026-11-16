import { z } from 'zod';

import { publicWebsite } from './urls';
import { canonicalYelpUrl, yelpBusiness } from './restaurantYelp';
export { publicWebsite } from './urls';

const website = z
  .string()
  .trim()
  .max(2048)
  .refine(publicWebsite, 'Use a public HTTPS website link.');
const optionalText = (max: number) => z.string().trim().max(max).nullable();
export function restaurantVideo(
  value: string,
): { provider: 'Instagram' | 'TikTok'; url: string; embed: string } | null {
  try {
    const url = new URL(value);
    if (!publicWebsite(value)) return null;
    const host = url.hostname.replace(/^www\./, '');
    const instagram = /^\/(p|reel|reels)\/([\w-]+)\/?$/.exec(url.pathname);
    if (host === 'instagram.com' && instagram) {
      const canonical = `https://www.instagram.com/${instagram[1] === 'p' ? 'p' : 'reel'}/${instagram[2]}/`;
      return { provider: 'Instagram', url: canonical, embed: `${canonical}embed/` };
    }
    const tiktok = /^\/@[\w.-]+\/video\/(\d{10,25})\/?$/.exec(url.pathname);
    if (host === 'tiktok.com' && tiktok)
      return {
        provider: 'TikTok',
        url: `https://www.tiktok.com${url.pathname.replace(/\/$/, '')}`,
        embed: `https://www.tiktok.com/player/v1/${tiktok[1]}`,
      };
    return null;
  } catch {
    return null;
  }
}
export const restaurantLocation = z
  .object({
    neighborhood: z.string().trim().max(150),
    address: optionalText(500),
    phone: optionalText(80),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .refine(
    (value) => (value.latitude === null) === (value.longitude === null),
    'Enter both map coordinates, or leave both blank.',
  );
export type RestaurantLocation = z.infer<typeof restaurantLocation>;
export const emptyRestaurantLocation: RestaurantLocation = {
  neighborhood: '',
  address: null,
  phone: null,
  latitude: null,
  longitude: null,
};
export const restaurantInput = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1, 'Enter a restaurant name.').max(200),
    cuisine: z.string().trim().max(100),
    neighborhood: optionalText(150),
    locations: z.array(restaurantLocation).max(12).default([]),
    status: z.enum(['visited', 'want_to_go']),
    is_favorite: z.boolean(),
    price_range: z
      .string()
      .trim()
      .regex(
        /^\$?\d+(?:\.\d{1,2})?\s*[-–]\s*\$?\d+(?:\.\d{1,2})?$/,
        'Enter a number range, like $20–30.',
      )
      .refine((value) => {
        const [low, high] = value.replace(/\$/g, '').split(/[-–]/).map(Number);
        return low <= high && high <= 10000;
      }, 'Enter a price range from low to high.')
      .nullable(),
    visited_on: z.iso.date().nullable(),
    rating: z.number().min(0).max(5).multipleOf(0.5).nullable(),
    companions: z.array(z.string().trim().min(1).max(100)).max(30),
    notes: z.string().trim().max(10000),
    website: website.nullable(),
    yelp_url: z
      .string()
      .max(2048)
      .refine((value) => canonicalYelpUrl(value) !== null, 'Use a Yelp business link.')
      .nullable()
      .default(null),
    address: optionalText(500),
    phone: optionalText(80),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    photo_urls: z.array(website).max(12),
    thumbnail_url: website.nullable().default(null),
    yelp_data: z.array(yelpBusiness).max(12).default([]),
    video_urls: z
      .array(
        z
          .string()
          .max(2048)
          .refine(
            (value) => restaurantVideo(value) !== null,
            'Use a full Instagram post/reel or TikTok video link. Open shortened links first.',
          ),
      )
      .max(20),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'want_to_go' && (value.rating !== null || value.visited_on !== null))
      ctx.addIssue({
        code: 'custom',
        message: 'Visit dates and ratings belong to places you’ve visited.',
        path: ['status'],
      });
    if ((value.latitude === null) !== (value.longitude === null))
      ctx.addIssue({
        code: 'custom',
        message: 'Enter both map coordinates, or leave both blank.',
        path: ['latitude'],
      });
  });
export type RestaurantInput = z.infer<typeof restaurantInput>;
export type Restaurant = RestaurantInput & { id: string; created_at: string; updated_at: string };
export const restaurantRecord = restaurantInput.safeExtend({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export const emptyRestaurant: RestaurantInput = {
  slug: '',
  name: '',
  cuisine: '',
  neighborhood: null,
  locations: [],
  status: 'want_to_go',
  is_favorite: false,
  price_range: null,
  visited_on: null,
  rating: null,
  companions: [],
  notes: '',
  website: null,
  yelp_url: null,
  address: null,
  phone: null,
  latitude: null,
  longitude: null,
  photo_urls: [],
  thumbnail_url: null,
  yelp_data: [],
  video_urls: [],
};
export function restaurantSlug(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 140)
      .replace(/-$/, '') || 'restaurant'
  );
}
export function restaurantDate(value: string | null): string {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
}
export function restaurantMapsUrl(
  restaurant: Pick<Restaurant, 'name' | 'address' | 'neighborhood'>,
): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([restaurant.name, restaurant.address || restaurant.neighborhood || 'San Francisco'].filter(Boolean).join(', '))}`;
}

/** Legacy scalar fields remain readable; explicit locations are authoritative. */
export function restaurantLocations(
  restaurant: Pick<
    RestaurantInput,
    'locations' | 'neighborhood' | 'address' | 'phone' | 'latitude' | 'longitude'
  >,
): RestaurantLocation[] {
  return restaurant.locations.length
    ? restaurant.locations
    : [
        {
          neighborhood: restaurant.neighborhood ?? '',
          address: restaurant.address,
          phone: restaurant.phone,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
        },
      ];
}
export function restaurantNeighborhoods(
  restaurant: Parameters<typeof restaurantLocations>[0],
): string {
  return [
    ...new Set(
      restaurantLocations(restaurant)
        .map((location) => location.neighborhood)
        .filter(Boolean),
    ),
  ].join(' / ');
}
export type RestaurantTab = 'visited' | 'want_to_go' | 'favorites';

/** Group dish/style labels under countries or regions without rewriting saved records. */
export function restaurantCuisineRegions(cuisine: string): string[] {
  const aliases: Record<string, string | null> = {
    cantonese: 'Chinese',
    'hong kong': 'Chinese',
    'dim sum': 'Chinese',
    noodles: null,
    ramen: 'Japanese',
    pizza: 'Italian',
    'korean bbq': 'Korean',
    bbq: null,
  };
  return [
    ...new Set(
      cuisine.split(/\s*[/&,]\s*/).flatMap((value) => {
        const label = value.trim().replace(/\s+/g, ' ');
        if (!label) return [];
        const region = Object.hasOwn(aliases, label.toLowerCase())
          ? aliases[label.toLowerCase()]
          : label[0].toUpperCase() + label.slice(1);
        return region ? [region] : [];
      }),
    ),
  ];
}

export function restaurantInTab(
  restaurant: Pick<Restaurant, 'status' | 'is_favorite'>,
  tab: RestaurantTab,
): boolean {
  return tab === 'favorites' ? restaurant.is_favorite : restaurant.status === tab;
}
export function restaurantCanonicalSlug(slug: string): string {
  return ['dumpling-story-valencia', 'dumpling-story-fillmore', 'dumpling-story-marina'].includes(
    slug,
  )
    ? 'dumpling-story'
    : slug;
}
