import { restaurantCanonicalSlug } from '@/lib/restaurants';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { RestaurantDetail } from '@/views/RestaurantDetail';
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
  return restaurant
    ? restaurantMetadata(restaurant)
    : {
        title: 'Restaurant not found',
        robots: { index: false, follow: false },
        openGraph: { images: [] },
        twitter: { images: [] },
      };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (restaurantCanonicalSlug(slug) !== slug)
    permanentRedirect(`/restaurants/${restaurantCanonicalSlug(slug)}`);
  if (!(await getPublicRestaurants()).some((item) => item.slug === restaurantCanonicalSlug(slug)))
    notFound();
  return <RestaurantDetail slug={slug} />;
}
