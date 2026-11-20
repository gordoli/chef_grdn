import { z } from 'zod';
import { socialImportPolicy } from '@/config/loading';
import { yelpImportResult } from './restaurantYelp';
import { tikTokImportResult } from './restaurantTikTok';

const fields = {
  id: z.uuid(),
  owner: z.uuid(),
  url: z.string().max(2048),
  ticket: z.string().min(1).max(4096),
  restaurant_id: z.uuid().nullable().default(null),
  location_index: z.number().int().min(0).max(11).default(0),
  expires: z.number(),
  status: z.enum(['running', 'ready', 'paused']),
  stage: z.enum(['details', 'photos']).default('details'),
  error: z.string().max(500).default(''),
};
export const restaurantImportJob = z.discriminatedUnion('source', [
  z.object({
    ...fields,
    source: z.literal('yelp'),
    result: yelpImportResult.nullable(),
    preview: yelpImportResult.nullable(),
  }),
  z.object({
    ...fields,
    source: z.literal('tiktok'),
    result: tikTokImportResult.nullable(),
    preview: z.null(),
  }),
]);
export type RestaurantImportJob = z.infer<typeof restaurantImportJob>;
export type RestaurantImportSource = RestaurantImportJob['source'];
export const restaurantImportStorageKey = (owner: string) => `grdn.restaurant-imports.v1.${owner}`;
export function restoreRestaurantImports(
  value: string | null,
  owner: string,
  now = Date.now(),
): RestaurantImportJob[] {
  if (!value || value.length > socialImportPolicy.maxProviderBytes * 2) return [];
  try {
    const data: unknown = JSON.parse(value);
    if (!Array.isArray(data)) return [];
    return data.slice(0, socialImportPolicy.maxQueuedImports).flatMap((value) => {
      const job = restaurantImportJob.safeParse(value);
      return job.success && job.data.owner === owner && job.data.expires > now ? [job.data] : [];
    });
  } catch {
    return [];
  }
}
export function restaurantImportLabel(job: RestaurantImportJob): string {
  if (job.source === 'yelp') return (job.result ?? job.preview)?.business.name || 'Yelp import';
  return job.result?.name || 'TikTok import';
}
export function restaurantImportProgress(job: RestaurantImportJob): string {
  if (job.status === 'ready') return 'Ready to review';
  if (job.status === 'paused') return job.error || 'Paused — resume to check progress';
  if (job.source === 'tiktok') return 'Reading the TikTok video…';
  return job.stage === 'photos'
    ? 'Details ready · collecting review photos…'
    : 'Collecting restaurant details…';
}
