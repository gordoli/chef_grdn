'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { cn } from '@/lib/utils';

export function AddSheet({
  open,
  onOpenChange,
  title,
  children,
  onBack,
  busy = false,
  form = false,
  focusKey,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onBack?: () => void;
  busy?: boolean;
  form?: boolean;
  focusKey?: string;
  className?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const previousFocusKey = useRef(focusKey);
  useEffect(() => {
    if (open && previousFocusKey.current !== focusKey) heading.current?.focus();
    previousFocusKey.current = focusKey;
  }, [open, focusKey]);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn('add-sheet', className)}
        data-form={form}
        overlayClassName="add-sheet-overlay"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          heading.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
      >
        <span className="add-sheet-handle" aria-hidden="true" />
        <header className="add-sheet-heading">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="glass-control add-sheet-back"
              aria-label="Back"
              onClick={onBack}
              disabled={busy}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
          <DialogTitle ref={heading} tabIndex={-1}>
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review the details before saving.
          </DialogDescription>
        </header>
        <div className="add-sheet-body">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function AddSourceOptions({
  options,
}: {
  options: { label: string; icon: LucideIcon; onSelect: () => void }[];
}) {
  return (
    <div className="add-source-options">
      {options.map(({ label, icon: Icon, onSelect }) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          className="add-source-option"
          onClick={onSelect}
        >
          <span className="add-source-icon">
            <Icon aria-hidden="true" />
          </span>
          <span>{label}</span>
          <ChevronRight aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}

export function AddSheetProgress({ titles, index }: { titles: readonly string[]; index: number }) {
  return (
    <div className="add-sheet-progress">
      <span>
        {titles[index]} · Step {index + 1} of {titles.length}
      </span>
      <ol aria-label="Setup steps">
        {titles.map((title, i) => (
          <li
            key={title}
            aria-label={title}
            aria-current={i === index ? 'step' : undefined}
            data-complete={i <= index}
          />
        ))}
      </ol>
    </div>
  );
}
