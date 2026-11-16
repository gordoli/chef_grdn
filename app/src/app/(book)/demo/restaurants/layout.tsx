import type { ReactNode } from 'react';
import { RestaurantProvider } from '@/hooks/RestaurantProvider';
import { demoRestaurants } from '@/lib/restaurantSeeds';
export default function Layout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <RestaurantProvider initialRestaurants={demoRestaurants} isDemo>
      {children}
      {modal}
    </RestaurantProvider>
  );
}
