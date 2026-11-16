/** Read the CSS token instead of maintaining a second animation duration in JavaScript. */
export function motionDurationMs(
  element: Element,
  token: '--motion-standard' | '--motion-panel' | '--motion-roll-duration',
): number {
  const value = getComputedStyle(element).getPropertyValue(token).trim();
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number * (value.endsWith('ms') ? 1 : 1000) : 0;
}
