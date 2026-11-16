import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { RestaurantDetailContent } from '@/components/restaurants/RestaurantDetailPanel';
import { restaurantCanonicalSlug } from '@/lib/restaurants';
import { getPublicRestaurants } from '@/lib/publicRestaurants';
import { restaurantMetadata } from '@/lib/restaurantSharing';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = (await getPublicRestaurants()).find(
    (item) => item.slug === restaurantCanonicalSlug(slug),
  );
  return restaurant ? restaurantMetadata(restaurant) : { title: 'Restaurant not found' };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const canonical = restaurantCanonicalSlug(slug);
  if (canonical !== slug) permanentRedirect(`/restaurants/${canonical}`);
  if (!(await getPublicRestaurants()).some((restaurant) => restaurant.slug === slug)) notFound();
  return <RestaurantDetailContent slug={slug} />;
}
