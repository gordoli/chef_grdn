import { describe, expect, it, vi } from 'vitest';
import { resolveTikTokImportUrl } from './restaurantTikTok';
import { socialImportPolicy } from '../src/config/loading';

const share = 'https://www.tiktok.com/t/ZTPyfBqC9/';
const video = 'https://www.tiktok.com/@yelpnorcal/video/7703216902205721886';

describe('TikTok shared-link resolution', () => {
  it('expands supported short links, drops tracking, and avoids fetching full video pages', async () => {
    const redirect = vi.fn().mockResolvedValue(`${video}?_t=tracking&_r=1`);
    for (const short of [share, 'https://vm.tiktok.com/ABC123/', 'https://vt.tiktok.com/ABC123/']) {
      expect(await resolveTikTokImportUrl(short, redirect)).toBe(video);
    }
    expect(redirect).toHaveBeenCalledTimes(3);
    expect(await resolveTikTokImportUrl(`${video}?tracking=1`, redirect)).toBe(video);
    expect(redirect).toHaveBeenCalledTimes(3);
  });
  it('handles bounded relative redirects on TikTok', async () => {
    const redirect = vi.fn().mockResolvedValueOnce('/t/other/').mockResolvedValueOnce(video);
    expect(await resolveTikTokImportUrl(share, redirect)).toBe(video);
    expect(redirect.mock.calls[1][0]).toBe('https://www.tiktok.com/t/other/');
  });
  it('never follows redirects to private addresses, other hosts, profiles, or credentialed URLs', async () => {
    for (const target of [
      'https://127.0.0.1/video',
      'http://www.tiktok.com/t/ABC/',
      'https://tiktok.com.evil.com/t/ABC/',
      'https://user:password@www.tiktok.com/t/ABC/',
      'https://www.tiktok.com/@profile',
    ]) {
      const redirect = vi.fn().mockResolvedValue(target);
      await expect(resolveTikTokImportUrl(share, redirect)).rejects.toThrow('shared link');
      expect(redirect).toHaveBeenCalledTimes(1);
    }
  });
  it('rejects invalid inputs before any request and stops missing or looping redirects', async () => {
    const invalid = vi.fn();
    await expect(resolveTikTokImportUrl('https://evil.com/t/ABC/', invalid)).rejects.toThrow(
      'TikTok video',
    );
    expect(invalid).not.toHaveBeenCalled();
    await expect(resolveTikTokImportUrl(share, vi.fn().mockResolvedValue(null))).rejects.toThrow(
      'shared link',
    );
    const loop = vi.fn().mockResolvedValue(share);
    await expect(resolveTikTokImportUrl(share, loop)).rejects.toThrow('shared link');
    expect(loop).toHaveBeenCalledTimes(socialImportPolicy.maxTikTokRedirects);
  });
});
