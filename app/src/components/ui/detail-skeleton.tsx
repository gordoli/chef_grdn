'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from './button';
import { useDetailPanelClose } from './detail-panel';

export function DetailSkeleton({ kind }: { kind: 'recipe' | 'restaurant' }) {
  const close = useDetailPanelClose();
  return (
    <>
      <div className="sheet-topbar">
        <Button variant="ghost" size="icon" aria-label={`Back to ${kind}s`} onClick={close}>
          <ChevronLeft />
        </Button>
      </div>
      <div
        className="detail-skeleton"
        role="status"
        aria-label={`Loading ${kind}`}
        aria-busy="true"
      >
        <span className="sr-only">Loading {kind}…</span>
        <div className="detail-skeleton-photo" aria-hidden="true" />
        <div className="detail-skeleton-copy" aria-hidden="true">
          <div className="detail-skeleton-title" />
          <div className="detail-skeleton-line" />
          <div className="detail-skeleton-pills">
            <span />
            <span />
            <span />
          </div>
          <div className="detail-skeleton-line" />
          <div className="detail-skeleton-line" />
        </div>
      </div>
    </>
  );
}
