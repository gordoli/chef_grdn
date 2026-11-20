'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useSession } from './useSession';
import { isOwnerSession } from '@/lib/auth';
import { canonicalYelpImportUrl, yelpImportResult } from '@/lib/restaurantYelp';
import { canonicalTikTokImportUrl, tikTokImportResult } from '@/lib/restaurantTikTok';
import {
  restaurantImportJob,
  restaurantImportStorageKey,
  restoreRestaurantImports,
  type RestaurantImportJob,
  type RestaurantImportSource,
} from '@/lib/restaurantImportJobs';
import { socialImportPolicy } from '@/config/loading';
import {
  ImportRequestError,
  requestRestaurantImport,
  waitForImportPoll,
} from './restaurantImportRequests';

type ImportState = {
  jobs: RestaurantImportJob[];
  start: (
    url: string,
    source: RestaurantImportSource,
    target?: { restaurantId?: string; locationIndex?: number },
  ) => Promise<string>;
  dismiss: (id: string) => void;
  resume: (id: string) => void;
};
const Context = createContext<ImportState | null>(null);
export function useRestaurantImports() {
  const value = useContext(Context);
  if (!value) throw new Error('Restaurant imports require RestaurantImportProvider');
  return value;
}
export function RestaurantImportProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useSession();
  const owner = isOwnerSession(session, profile) ? session!.user.id : null;
  const [stored, setStored] = useState<RestaurantImportJob[]>([]);
  const jobs = stored.filter((job) => job.owner === owner && job.expires > Date.now());
  const latest = useRef(stored);
  latest.current = stored;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const update = useCallback(
    (ownerId: string, change: (jobs: RestaurantImportJob[]) => RestaurantImportJob[]) => {
      if (ownerRef.current !== ownerId) return;
      const next = change(
        latest.current.filter((job) => job.owner === ownerId && job.expires > Date.now()),
      );
      latest.current = next;
      setStored(next);
      try {
        localStorage.setItem(restaurantImportStorageKey(ownerId), JSON.stringify(next));
      } catch {
        toast.error(
          'Your import is running, but this browser could not save its progress. Keep this tab open.',
        );
      }
    },
    [],
  );
  useEffect(() => {
    if (!owner) {
      setStored([]);
      return;
    }
    let restored: RestaurantImportJob[] = [];
    try {
      restored = restoreRestaurantImports(
        localStorage.getItem(restaurantImportStorageKey(owner)),
        owner,
      );
    } catch {
      /* Storage may be disabled. */
    }
    latest.current = restored;
    setStored(restored);
  }, [owner]);
  const token = session?.access_token;
  const running = jobs
    .filter((job) => job.status === 'running')
    .map((job) => job.id)
    .join(',');
  useEffect(() => {
    if (!owner || !token || !running) return;
    const controller = new AbortController();
    const patch = (
      id: string,
      value: Partial<
        Pick<RestaurantImportJob, 'status' | 'result' | 'preview' | 'stage' | 'error'>
      >,
    ) =>
      update(owner, (jobs) =>
        jobs.map((job) => (job.id === id ? restaurantImportJob.parse({ ...job, ...value }) : job)),
      );
    const poll = async (id: string) => {
      let failures = 0;
      for (let attempt = 0; attempt < socialImportPolicy.maxPollAttempts; attempt++) {
        const job = latest.current.find((job) => job.id === id && job.owner === owner);
        if (!job || job.status !== 'running' || controller.signal.aborted) return;
        try {
          const response = await requestRestaurantImport(
            job.source,
            token,
            { action: 'poll', ticket: job.ticket, preview: job.source === 'yelp' && !job.preview },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          failures = 0;
          if (response.status !== 202) {
            const result =
              job.source === 'yelp'
                ? yelpImportResult.parse(response.data)
                : tikTokImportResult.parse(response.data);
            patch(id, { status: 'ready', result, error: '' });
            toast.success('Restaurant import ready to review');
            return;
          }
          if (response.data && typeof response.data === 'object') {
            const data = response.data;
            patch(id, {
              stage: 'stage' in data && data.stage === 'photos' ? 'photos' : 'details',
              ...(job.source === 'yelp' && 'preview' in data
                ? { preview: yelpImportResult.parse(data.preview) }
                : {}),
            });
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          failures++;
          if (
            (error instanceof ImportRequestError &&
              error.status < 500 &&
              ![408, 429].includes(error.status)) ||
            failures >= socialImportPolicy.maxPollFailures
          ) {
            patch(id, {
              status: 'paused',
              error:
                error instanceof Error
                  ? error.message
                  : 'Connection interrupted. Resume to check this import.',
            });
            return;
          }
        }
        try {
          await waitForImportPoll(controller.signal);
        } catch {
          return;
        }
      }
      patch(id, { status: 'paused', error: 'Still collecting. Resume to check again.' });
    };
    for (const id of running.split(',')) void poll(id);
    return () => controller.abort();
  }, [owner, token, running, update]);
  const start = async (
    value: string,
    source: RestaurantImportSource,
    target: { restaurantId?: string; locationIndex?: number } = {},
  ) => {
    if (!owner || !token) throw new Error('Sign in as the owner to import a restaurant.');
    const url = source === 'yelp' ? canonicalYelpImportUrl(value) : canonicalTikTokImportUrl(value);
    if (!url)
      throw new Error(
        source === 'yelp' ? 'Paste a Yelp business or share link.' : 'Paste a TikTok video link.',
      );
    const existing = latest.current.find(
      (job) =>
        job.owner === owner &&
        job.source === source &&
        job.url === url &&
        job.restaurant_id === (target.restaurantId ?? null) &&
        job.location_index === (target.locationIndex ?? 0) &&
        job.expires > Date.now(),
    );
    if (existing) return existing.id;
    if (jobs.length >= socialImportPolicy.maxQueuedImports)
      throw new Error('Review or dismiss an existing import first.');
    const { data } = await requestRestaurantImport(source, token, { action: 'start', url });
    if (!data || typeof data !== 'object' || !('ticket' in data) || typeof data.ticket !== 'string')
      throw new Error('The import did not start. Try again.');
    const job = restaurantImportJob.parse({
      id: crypto.randomUUID(),
      owner,
      url,
      source,
      restaurant_id: target.restaurantId ?? null,
      location_index: target.locationIndex ?? 0,
      ticket: data.ticket,
      expires: Date.now() + socialImportPolicy.ticketLifetimeMs,
      status: 'running',
      stage: 'details',
      error: '',
      preview: null,
      result: null,
    });
    update(owner, (jobs) => [...jobs, job]);
    return job.id;
  };
  const dismiss = (id: string) => {
    if (owner) update(owner, (jobs) => jobs.filter((job) => job.id !== id));
  };
  const resume = (id: string) => {
    if (owner)
      update(owner, (jobs) =>
        jobs.map((job) => (job.id === id ? { ...job, status: 'running', error: '' } : job)),
      );
  };
  return <Context.Provider value={{ jobs, start, dismiss, resume }}>{children}</Context.Provider>;
}
