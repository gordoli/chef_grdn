'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { useRecipePanel } from '@/hooks/useRecipePanel';
import { cn } from '@/lib/utils';

const DetailPanelContext = createContext<(() => void) | null>(null);

export function useDetailPanelClose() {
  const close = useContext(DetailPanelContext);
  if (!close) throw new Error('Detail content requires a DetailPanel.');
  return close;
}

/** Route layouts own this frame so loading content cannot replay its entry animation. */
export function DetailPanel({
  children,
  title,
  collectionPath,
  navigation = 'back',
  className,
}: {
  children: ReactNode;
  title: string;
  collectionPath: string;
  navigation?: 'back' | 'replace';
  className?: string;
}) {
  const panel = useRecipePanel(collectionPath, navigation);
  return (
    <Dialog
      open={panel.open}
      onOpenChange={(open) => {
        if (!open) panel.close();
      }}
    >
      <DialogContent
        ref={panel.ref}
        className={cn('recipe-sheet', className)}
        overlayClassName="recipe-overlay"
        showCloseButton={false}
        aria-describedby={undefined}
        {...panel.panelProps}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DetailPanelContext.Provider value={panel.close}>{children}</DetailPanelContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
