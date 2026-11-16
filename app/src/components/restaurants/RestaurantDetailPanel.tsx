'use client';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { DetailPanel, useDetailPanelClose } from '@/components/ui/detail-panel';
import { useRestaurants } from '@/hooks/useRestaurants';
import { RestaurantDetail } from '@/views/RestaurantDetail';

/** Intercepted detail routes leave the collection and its decoded images mounted underneath. */
export function RestaurantDetailPanel({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { restaurants, isDemo } = useRestaurants();
  const name = restaurants.find((restaurant) => restaurant.slug === slug)?.name ?? 'Restaurant';
  return (
    <DetailPanel
      title={name}
      collectionPath={`${isDemo ? '/demo' : ''}/restaurants`}
      className="restaurant-detail-panel"
    >
      {children}
    </DetailPanel>
  );
}

export function RestaurantDetailContent({ slug }: { slug: string }) {
  const close = useDetailPanelClose();
  return (
    <div className="restaurant-panel-scroll">
      <RestaurantDetail slug={slug} onBack={close} />
    </div>
  );
}
