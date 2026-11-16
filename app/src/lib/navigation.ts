/** Paths are relative to the live/demo collection prefix. */
export function isDetailScreen(path: string): boolean {
  return /^\/(?:r|restaurants)\/[^/]+(?:\/edit)?\/?$/.test(path);
}

/** Two app sections: recipe and utility routes belong to Recipes by default. */
export function navigationSection(pathname: string, prefix = ''): '/' | '/restaurants' {
  const current = pathname.slice(prefix.length) || '/';
  return current === '/restaurants' || current.startsWith('/restaurants/') || current === '/roll'
    ? '/restaurants'
    : '/';
}
