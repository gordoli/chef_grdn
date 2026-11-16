import { describe, expect, it } from 'vitest';
import { shouldDismissRecipe } from './recipeSwipe';

describe('recipe swipe dismissal', () => {
  it('accepts a deliberate swipe relative to screen width or a short, fast flick', () => {
    expect(shouldDismissRecipe(115, 8, 700, 390)).toBe(true);
    expect(shouldDismissRecipe(140, 10, 900, 900)).toBe(true);
    expect(shouldDismissRecipe(60, 3, 70, 390)).toBe(true);
  });
  it('keeps taps, slow short drags, vertical scrolling and left swipes on the recipe', () => {
    expect(shouldDismissRecipe(12, 0, 10, 390)).toBe(false);
    expect(shouldDismissRecipe(80, 2, 600, 390)).toBe(false);
    expect(shouldDismissRecipe(120, 100, 90, 390)).toBe(false);
    expect(shouldDismissRecipe(-200, 5, 200, 390)).toBe(false);
  });
  it('rejects invalid geometry without accidentally navigating', () => {
    expect(shouldDismissRecipe(150, 0, 100, 0)).toBe(false);
    expect(shouldDismissRecipe(150, 0, -1, 390)).toBe(false);
    expect(shouldDismissRecipe(Infinity, 0, 100, 390)).toBe(false);
  });
});
