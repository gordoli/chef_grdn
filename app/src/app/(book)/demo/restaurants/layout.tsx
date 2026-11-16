import type { ReactNode } from 'react';
import { RestaurantProvider } from '@/hooks/RestaurantProvider';
import { demoRestaurants } from '@/lib/restaurantSeeds';
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RestaurantProvider initialRestaurants={demoRestaurants} isDemo>
      {children}
    </RestaurantProvider>
  );
}
