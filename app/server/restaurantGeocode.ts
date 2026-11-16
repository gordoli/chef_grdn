/** Fixed-origin Census address lookup. No API keys or device location are needed. */
export async function geocodeRestaurantAddress(
  address: string,
  fetcher: typeof fetch = fetch,
): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('format', 'json');
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const raw = await response.text();
    if (raw.length > 100000) return null;
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== 'object' ||
      !('result' in data) ||
      !data.result ||
      typeof data.result !== 'object' ||
      !('addressMatches' in data.result) ||
      !Array.isArray(data.result.addressMatches) ||
      data.result.addressMatches.length !== 1
    )
      return null;
    const coordinates = data.result.addressMatches[0]?.coordinates;
    if (
      typeof coordinates?.x !== 'number' ||
      typeof coordinates?.y !== 'number' ||
      !Number.isFinite(coordinates.x) ||
      !Number.isFinite(coordinates.y) ||
      Math.abs(coordinates.x) > 180 ||
      Math.abs(coordinates.y) > 90
    )
      return null;
    return { latitude: coordinates.y, longitude: coordinates.x };
  } catch {
    return null;
  }
}
