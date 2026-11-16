import type { ReactNode } from 'react';
import { RestaurantProvider } from '@/hooks/RestaurantProvider';
import { getPublicRestaurants } from '@/lib/publicRestaurants';
// Read the current public collection at request time, including share-preview revisions.
export const dynamic = 'force-dynamic';
export default async function RestaurantsLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <RestaurantProvider initialRestaurants={await getPublicRestaurants()}>
      {children}
      {modal}
    </RestaurantProvider>
  );
}
