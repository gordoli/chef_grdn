'use client';
import { useState } from 'react';
import { useRestaurantImports } from './RestaurantImportProvider';
import { useRestaurants } from './useRestaurants';
import { restaurantImportProgress, type RestaurantImportSource } from '@/lib/restaurantImportJobs';

export function useRestaurantSocialImport(initialId?: string) {
  const imports = useRestaurantImports();
  const { isDemo } = useRestaurants();
  const [id, setId] = useState(initialId);
  const job = imports.jobs.find((job) => job.id === id);
  const start = async (
    url: string,
    source: RestaurantImportSource,
    target?: { restaurantId?: string; locationIndex?: number },
  ) => {
    if (isDemo) throw new Error('Imports are available in the live collection.');
    const id = await imports.start(url, source, target);
    setId(id);
  };
  const cancel = () => {
    if (id) imports.dismiss(id);
    setId(undefined);
  };
  return {
    job,
    progress: job ? restaurantImportProgress(job) : '',
    startYelp: (url: string, target?: { restaurantId?: string; locationIndex?: number }) =>
      start(url, 'yelp', target),
    startTikTok: (url: string, target?: { restaurantId?: string; locationIndex?: number }) =>
      start(url, 'tiktok', target),
    cancel,
    resume: () => {
      if (id) imports.resume(id);
    },
    consume: cancel,
  };
}
