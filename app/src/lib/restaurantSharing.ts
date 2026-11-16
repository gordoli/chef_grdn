import type { Metadata } from 'next';
import { restaurantNeighborhoods, type Restaurant } from './restaurants';
const version = (restaurant: Restaurant) => `1-${restaurant.updated_at}`;
export function restaurantShareUrl(restaurant: Restaurant, currentUrl: string): string {
  const url = new URL(currentUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('share', version(restaurant));
  return url.href;
}
export function restaurantMetadata(restaurant: Restaurant): Metadata {
  const path = `/restaurants/${encodeURIComponent(restaurant.slug)}`;
  const description = [
    restaurant.cuisine,
    restaurantNeighborhoods(restaurant),
    restaurant.price_range,
    restaurant.rating !== null
      ? `${restaurant.rating}/5`
      : restaurant.status === 'want_to_go'
        ? 'Want to go'
        : 'Visited',
  ]
    .filter(Boolean)
    .join(' · ');
  const image = {
    url: `${path}/share-image?v=${encodeURIComponent(version(restaurant))}`,
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: `${restaurant.name} · Chef GRDN`,
  };
  return {
    title: restaurant.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: restaurant.name,
      description,
      url: path,
      siteName: 'Chef GRDN',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: restaurant.name, description, images: [image] },
  };
}
