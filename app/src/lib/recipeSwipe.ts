/** Ignore taps, leftward drags and vertical scrolling; accept a deliberate right swipe. */
export function shouldDismissRecipe(
  dx: number,
  dy: number,
  elapsed: number,
  width: number,
): boolean {
  if (![dx, dy, elapsed, width].every(Number.isFinite) || width <= 0 || elapsed < 0) return false;
  if (dx < 48 || dx < Math.abs(dy) * 1.5) return false;
  return dx >= Math.min(128, width * 0.28) || dx / Math.max(elapsed, 16) >= 0.65;
}
