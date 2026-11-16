/** Paths are relative to the live/demo collection prefix. */
export function isDetailScreen(path: string): boolean {
  return /^\/(?:r|restaurants)\/[^/]+(?:\/edit)?\/?$/.test(path);
}
