import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { shouldDismissRecipe } from '@/lib/recipeSwipe';
import { motionDurationMs } from '@/theme/motion';
import { recipeSwipeGesture } from '@/theme/gestures';

type Gesture = { id: number; x: number; y: number; started: number; dragging: boolean };

/** Keep detail panels mounted until their back transition finishes. */
export function useRecipePanel(collectionPath: string, navigation: 'replace' | 'back' = 'replace') {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const navigated = useRef(false);
  const [open, setOpen] = useState(true);
  const finish = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    if (navigation === 'back') router.back();
    else router.replace(collectionPath, { scroll: false });
  }, [router, collectionPath, navigation]);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    // Also complete navigation if an animation is interrupted or disabled externally.
    const duration = motionDurationMs(document.documentElement, '--motion-standard');
    const timer = window.setTimeout(() => requestAnimationFrame(finish), duration);
    return () => window.clearTimeout(timer);
  }, [open, finish]);

  function resetDrag() {
    gesture.current = null;
    ref.current?.removeAttribute('data-dragging');
    ref.current?.style.setProperty('--recipe-drag', '0px');
  }
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!open || !event.isPrimary) {
      resetDrag();
      return;
    }
    if (
      event.button !== 0 ||
      target.closest('button,a,input,textarea,select,label,.photo-strip') ||
      target.closest('[role="dialog"]') !== event.currentTarget
    )
      return;
    // Mouse dragging is limited to the empty header, preserving text selection in the recipe.
    if (event.pointerType === 'mouse' && !target.closest('.sheet-topbar')) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      started: event.timeStamp,
      dragging: false,
    };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || !open) return;
    const dx = event.clientX - current.x,
      dy = event.clientY - current.y;
    if (!current.dragging) {
      if (
        (Math.abs(dy) > recipeSwipeGesture.activationPx && Math.abs(dy) >= Math.abs(dx)) ||
        dx < -recipeSwipeGesture.activationPx
      ) {
        resetDrag();
        return;
      }
      if (
        dx < recipeSwipeGesture.activationPx ||
        dx < Math.abs(dy) * recipeSwipeGesture.horizontalIntentRatio
      )
        return;
      current.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.setAttribute('data-dragging', 'true');
    }
    event.preventDefault();
    event.currentTarget.style.setProperty('--recipe-drag', `${Math.max(0, dx)}px`);
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dismiss =
      current.dragging &&
      shouldDismissRecipe(
        event.clientX - current.x,
        event.clientY - current.y,
        event.timeStamp - current.started,
        event.currentTarget.clientWidth,
      );
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (dismiss) {
      gesture.current = null;
      event.currentTarget.removeAttribute('data-dragging');
      close();
    } else resetDrag();
  }
  return {
    ref,
    open,
    close,
    panelProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: resetDrag,
      onAnimationEnd: (event: React.AnimationEvent<HTMLDivElement>) => {
        if (!open && event.target === event.currentTarget && event.animationName === 'recipe-exit')
          finish();
      },
    },
  };
}
