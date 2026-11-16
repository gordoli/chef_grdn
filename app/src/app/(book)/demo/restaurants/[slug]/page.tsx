import { restaurantCanonicalSlug } from '@/lib/restaurants';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { demoRestaurants } from '@/lib/restaurantSeeds';
import { RestaurantDetail } from '@/views/RestaurantDetail';
export const metadata: Metadata = {
  title: 'Restaurant preview',
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (restaurantCanonicalSlug(slug) !== slug)
    permanentRedirect(`/demo/restaurants/${restaurantCanonicalSlug(slug)}`);
  if (!demoRestaurants.some((r) => r.slug === slug)) notFound();
  return <RestaurantDetail slug={slug} />;
}
