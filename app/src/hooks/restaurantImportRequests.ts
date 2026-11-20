import { socialImportPolicy } from '@/config/loading';
import type { RestaurantImportSource } from '@/lib/restaurantImportJobs';

export class ImportRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function requestRestaurantImport(
  source: RestaurantImportSource,
  token: string,
  body: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/import-${source}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(socialImportPolicy.browserTimeoutMs),
    ]),
  });
  const data: unknown = await response.json();
  if (!response.ok)
    throw new ImportRequestError(
      data && typeof data === 'object' && 'error' in data
        ? String(data.error)
        : 'Import could not be completed.',
      response.status,
    );
  return { status: response.status, data };
}
/** Foregrounding a phone wakes polling immediately instead of waiting on a throttled timer. */
export function waitForImportPoll(
  signal: AbortSignal,
  interval = socialImportPolicy.pollIntervalMs,
  page: EventTarget = window,
  visibility: EventTarget & { visibilityState: string } = document,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      page.removeEventListener('focus', resume);
      visibility.removeEventListener('visibilitychange', resume);
      signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve();
    };
    const resume = () => {
      if (visibility.visibilityState === 'visible') finish();
    };
    const abort = () => finish(new DOMException('Import paused', 'AbortError'));
    const timer = setTimeout(() => finish(), interval);
    page.addEventListener('focus', resume);
    visibility.addEventListener('visibilitychange', resume);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
