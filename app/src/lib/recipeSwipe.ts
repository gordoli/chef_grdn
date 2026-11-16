import { recipeSwipeGesture as gesture } from '../theme/gestures';

/** Let vertical scrolling win before capturing a deliberate horizontal drag. */
export function detailSwipeIntent(dx: number, dy: number): 'pending' | 'scroll' | 'drag' {
  if (
    (Math.abs(dy) > gesture.activationPx && Math.abs(dy) >= Math.abs(dx)) ||
    dx < -gesture.activationPx
  )
    return 'scroll';
  return dx < gesture.activationPx || dx < Math.abs(dy) * gesture.horizontalIntentRatio
    ? 'pending'
    : 'drag';
}

/** Ignore taps, leftward drags and vertical scrolling; accept a deliberate right swipe. */
export function shouldDismissRecipe(
  dx: number,
  dy: number,
  elapsed: number,
  width: number,
): boolean {
  if (![dx, dy, elapsed, width].every(Number.isFinite) || width <= 0 || elapsed < 0) return false;
  if (dx < gesture.minimumDismissPx || dx < Math.abs(dy) * gesture.horizontalIntentRatio)
    return false;
  return (
    dx >= Math.min(gesture.maximumDismissPx, width * gesture.dismissWidthFraction) ||
    dx / Math.max(elapsed, gesture.minimumElapsedMs) >= gesture.fastSwipePxPerMs
  );
}
