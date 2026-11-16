/** Touch thresholds use physical pixels and velocity, independently of visual spacing. */
export const recipeSwipeGesture = {
  activationPx: 12,
  minimumDismissPx: 48,
  maximumDismissPx: 128,
  dismissWidthFraction: 0.28,
  horizontalIntentRatio: 1.5,
  fastSwipePxPerMs: 0.65,
  minimumElapsedMs: 16,
} as const;
