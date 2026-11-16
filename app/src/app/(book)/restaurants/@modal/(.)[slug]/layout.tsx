import type { ReactNode } from 'react';
import { RestaurantDetailPanel } from '@/components/restaurants/RestaurantDetailPanel';
export default function Layout({ children }: { children: ReactNode }) {
  return <RestaurantDetailPanel>{children}</RestaurantDetailPanel>;
}
