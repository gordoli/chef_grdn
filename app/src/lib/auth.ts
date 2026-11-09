/** Keep post-auth navigation on this site, including browser URL normalization. */
export function safeAuthDestination(value: string | null): string {
  if (
    !value?.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((character) => character.charCodeAt(0) <= 32)
  )
    return '/';
  const base = 'https://chef-grdn.invalid';
  const url = new URL(value, base);
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : '/';
}

export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 128) return 'Use no more than 128 characters.';
  if (password !== confirmation) return 'The passwords do not match.';
  return null;
}
