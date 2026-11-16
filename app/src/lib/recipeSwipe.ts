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
import { recipeSwipeGesture as gesture } from '../theme/gestures';
