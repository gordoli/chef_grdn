'use client';
import { socialImportPolicy } from '@/config/loading';
import { useEffect, useRef, useState } from 'react';
import { useSession } from './useSession';
import { useRestaurants } from './useRestaurants';
import { canonicalYelpUrl, yelpImportResult } from '@/lib/restaurantYelp';
import { canonicalTikTokImportUrl, tikTokImportResult } from '@/lib/restaurantTikTok';

export function useRestaurantSocialImport() {
  const { session } = useSession();
  const { isDemo } = useRestaurants();
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState('');
  useEffect(() => () => controller.current?.abort(), []);
  const cancel = () => controller.current?.abort();
  const run = async (url: string, source: 'yelp' | 'tiktok'): Promise<unknown> => {
    const label = source === 'yelp' ? 'Yelp' : 'TikTok';
    if (!session || isDemo)
      throw new Error(`Sign in as the owner in the live collection to import from ${label}.`);
    if (!(source === 'yelp' ? canonicalYelpUrl(url) : canonicalTikTokImportUrl(url)))
      throw new Error(
        source === 'yelp'
          ? 'Paste a full Yelp business link, like yelp.com/biz/restaurant-name.'
          : 'Paste a TikTok video link.',
      );
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const send = async (body: unknown) => {
      const response = await fetch(`/api/import-${source}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.any([
          active.signal,
          AbortSignal.timeout(socialImportPolicy.browserTimeoutMs),
        ]),
      });
      const data: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          data && typeof data === 'object' && 'error' in data
            ? String(data.error)
            : `${label} import failed.`,
        );
      return { response, data };
    };
    try {
      setProgress(`Starting ${label} import…`);
      const started = await send({ action: 'start', url });
      if (
        !started.data ||
        typeof started.data !== 'object' ||
        !('ticket' in started.data) ||
        typeof started.data.ticket !== 'string'
      )
        throw new Error(`${label} import did not start.`);
      const ticket = started.data.ticket;
      setProgress(
        source === 'yelp'
          ? 'Collecting restaurant details and review photos…'
          : 'Reading the TikTok video…',
      );
      for (let attempt = 0; attempt < socialImportPolicy.maxPollAttempts; attempt++) {
        await new Promise<void>((resolve, reject) => {
          const aborted = () => {
            clearTimeout(timer);
            reject(new DOMException('Import canceled', 'AbortError'));
          };
          const timer = setTimeout(() => {
            active.signal.removeEventListener('abort', aborted);
            resolve();
          }, socialImportPolicy.pollIntervalMs);
          active.signal.addEventListener('abort', aborted, { once: true });
          if (active.signal.aborted) aborted();
        });
        const { response, data } = await send({ action: 'poll', ticket });
        if (response.status !== 202) return data;
      }
      throw new Error(
        `${label} is taking longer than expected. Try again later or enter the details manually.`,
      );
    } finally {
      if (controller.current === active) {
        controller.current = null;
        setProgress('');
      }
    }
  };
  return {
    runYelp: async (url: string) => yelpImportResult.parse(await run(url, 'yelp')),
    runTikTok: async (url: string) => tikTokImportResult.parse(await run(url, 'tiktok')),
    cancel,
    progress,
  };
}
