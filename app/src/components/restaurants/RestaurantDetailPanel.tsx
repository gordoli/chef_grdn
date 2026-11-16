'use client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useRecipePanel } from '@/hooks/useRecipePanel';
import { useRestaurants } from '@/hooks/useRestaurants';
import { RestaurantDetail } from '@/views/RestaurantDetail';

/** Intercepted detail routes leave the collection and its decoded images mounted underneath. */
export function RestaurantDetailPanel({ slug }: { slug: string }) {
  const { restaurants, isDemo } = useRestaurants();
  const panel = useRecipePanel(`${isDemo ? '/demo' : ''}/restaurants`, 'back');
  const name = restaurants.find((restaurant) => restaurant.slug === slug)?.name ?? 'Restaurant';
  return (
    <Dialog
      open={panel.open}
      onOpenChange={(open) => {
        if (!open) panel.close();
      }}
    >
      <DialogContent
        ref={panel.ref}
        className="recipe-sheet restaurant-detail-panel"
        overlayClassName="recipe-overlay"
        showCloseButton={false}
        aria-describedby={undefined}
        {...panel.panelProps}
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <div className="restaurant-panel-scroll">
          <RestaurantDetail slug={slug} onBack={panel.close} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
