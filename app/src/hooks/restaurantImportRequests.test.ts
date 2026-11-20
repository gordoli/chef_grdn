import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForImportPoll } from './restaurantImportRequests';
afterEach(() => vi.useRealTimers());
describe('mobile import polling', () => {
  it('wakes a suspended poll as soon as the page becomes visible', async () => {
    vi.useFakeTimers();
    const page = new EventTarget(),
      visibility = Object.assign(new EventTarget(), { visibilityState: 'hidden' });
    const signal = new AbortController();
    const ready = vi.fn();
    const waiting = waitForImportPoll(signal.signal, 5000, page, visibility).then(ready);
    visibility.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
    visibility.visibilityState = 'visible';
    visibility.dispatchEvent(new Event('visibilitychange'));
    await waiting;
    expect(ready).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('aborts waits without leaking resume listeners or timers', async () => {
    vi.useFakeTimers();
    const page = new EventTarget(),
      visibility = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const signal = new AbortController();
    const waiting = waitForImportPoll(signal.signal, 5000, page, visibility);
    signal.abort();
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
    page.dispatchEvent(new Event('focus'));
    expect(vi.getTimerCount()).toBe(0);
  });
});
