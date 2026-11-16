'use client';
import type { ReactNode } from 'react';
import { useSlidingIndicator } from '@/hooks/useSlidingIndicator';
import { cn } from '@/lib/utils';

export function SegmentedControl({
  value,
  label,
  className,
  children,
}: {
  value: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { ref, highlight } = useSlidingIndicator<HTMLDivElement>(value, '[aria-pressed="true"]');
  return (
    <div
      ref={ref}
      className={cn('glass-control segmented-control', className)}
      role="group"
      aria-label={label}
      data-sliding={!!highlight}
    >
      {highlight && (
        <span
          aria-hidden="true"
          className="selection-highlight"
          style={{
            width: highlight.width,
            height: highlight.height,
            transform: `translate3d(${highlight.x}px, ${highlight.y}px, 0)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
