/** Public links are data; fetchers must additionally validate DNS and redirects. */
export function publicWebsite(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      url.hostname.includes('.') &&
      !/^[\d.]+$/.test(url.hostname) &&
      !url.hostname.includes(':') &&
      !/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}
