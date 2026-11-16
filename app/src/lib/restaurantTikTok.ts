import { z } from 'zod';
import { restaurantVideo, type RestaurantInput } from './restaurants';
import { publicWebsite } from './urls';

export function canonicalTikTokImportUrl(value: string): string | null {
  if (!publicWebsite(value)) return null;
  const video = restaurantVideo(value);
  if (video?.provider === 'TikTok') return video.url;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (
      (['vm.tiktok.com', 'vt.tiktok.com'].includes(host) &&
        /^\/[A-Za-z0-9_-]{3,100}\/?$/.test(url.pathname)) ||
      (host === 'tiktok.com' && /^\/t\/[A-Za-z0-9_-]{3,100}\/?$/.test(url.pathname))
    )
      return `https://${url.hostname}${url.pathname}`;
  } catch {
    /* Invalid links stay in the editable input. */
  }
  return null;
}

/** Only explicit location lines become suggestions; prose is never guessed as a business name. */
export function tikTokCaptionDetails(caption: string): { name: string; address: string | null } {
  const lines = caption
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const pinned = lines.findIndex((line) => /📍|📌|^(?:restaurant|location)\s*:/i.test(line));
  if (pinned < 0) return { name: '', address: null };
  const line = lines[pinned]
    .replace(/^.*?(?:📍|📌|(?:restaurant|location)\s*:)\s*/i, '')
    .split('#')[0]
    .trim();
  const addressPattern =
    /\b\d{1,6}\s+(?:[\p{L}\p{N}.'’-]+\s+){1,7}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Rd|Road|Way|Dr(?:ive)?|Ln|Lane)\b[^#📍📌\n]{0,150}/iu;
  const match = addressPattern.exec(line);
  const following = !match && lines[pinned + 1] ? addressPattern.exec(lines[pinned + 1]) : null;
  const name = (
    match
      ? line.slice(0, match.index)
      : line.split(/\s+\|\s+|\s+[–—]\s+|[👀📍📌]/u)[0].split(',')[0]
  ).replace(/^[\s,|:–—-]+|[\s,|:–—-]+$/g, '');
  return {
    name:
      name && name.length <= 120 && name.split(/\s+/).length <= 12 && !/https?:|@|[.!?]$/.test(name)
        ? name
        : '',
    address: (match?.[0] ?? following?.[0])?.trim().slice(0, 500) || null,
  };
}
export const tikTokImportResult = z.object({
  video_url: z
    .string()
    .max(2048)
    .refine((url) => restaurantVideo(url)?.provider === 'TikTok'),
  caption: z.string().max(10000),
  author: z.string().max(120),
  name: z.string().max(200),
  address: z.string().max(500).nullable(),
});
export type TikTokImportResult = z.infer<typeof tikTokImportResult>;
export function mergeTikTokImport(
  previous: RestaurantInput,
  imported: TikTokImportResult,
): RestaurantInput {
  const locations = previous.locations.length
    ? [...previous.locations]
    : [
        {
          neighborhood: previous.neighborhood || '',
          address: previous.address,
          phone: previous.phone,
          latitude: previous.latitude,
          longitude: previous.longitude,
        },
      ];
  if (!locations[0].address && imported.address)
    locations[0] = { ...locations[0], address: imported.address, latitude: null, longitude: null };
  return {
    ...previous,
    name: previous.name || imported.name,
    address: locations[0].address,
    latitude: locations[0].latitude,
    longitude: locations[0].longitude,
    locations,
    video_urls: [...new Set([...previous.video_urls, imported.video_url])],
  };
}
