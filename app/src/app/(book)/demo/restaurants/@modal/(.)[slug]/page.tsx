import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { RestaurantDetailContent } from '@/components/restaurants/RestaurantDetailPanel';
import { restaurantCanonicalSlug } from '@/lib/restaurants';
import { demoRestaurants } from '@/lib/restaurantSeeds';
export const metadata: Metadata = {
  title: 'Restaurant preview',
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const canonical = restaurantCanonicalSlug(slug);
  if (canonical !== slug) permanentRedirect(`/demo/restaurants/${canonical}`);
  if (!demoRestaurants.some((restaurant) => restaurant.slug === slug)) notFound();
  return <RestaurantDetailContent slug={slug} />;
}
