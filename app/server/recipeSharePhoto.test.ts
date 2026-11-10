import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { recipeSharePhoto } from './recipeSharePhoto';

const origin = 'https://project.supabase.co';
const photoUrl = `${origin}/storage/v1/object/sign/recipe-photos/recipe/photo.jpg?token=example`;

describe('recipe share photo', () => {
  it('fetches only recipe photos from the configured storage, never arbitrary or private buckets', async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const value of [
      undefined,
      'file:///etc/passwd',
      'https://other.example/photo.jpg',
      `${origin}/storage/v1/object/sign/review-photos/private.jpg`,
      `${origin}/storage/v1/object/sign/recipe-photos/../review-photos/private.jpg`,
      photoUrl.replace('https:', 'http:'),
      photoUrl.replace('https://', 'https://user:password@'),
    ]) {
      expect(await recipeSharePhoto(value, origin, fetcher)).toBeNull();
    }
    expect(await recipeSharePhoto(photoUrl, undefined, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('crops a real image to a square and returns self-contained JPEG bytes', async () => {
    const bytes = await sharp({
      create: { width: 800, height: 400, channels: 3, background: '#ddd' },
    })
      .png()
      .toBuffer();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(bytes, { headers: { 'Content-Type': 'image/png' } }));
    const result = await recipeSharePhoto(photoUrl, origin, fetcher);
    expect(fetcher).toHaveBeenCalledWith(
      photoUrl,
      expect.objectContaining({ redirect: 'error', cache: 'no-store' }),
    );
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    const normalized = await sharp(Buffer.from(result!.split(',')[1], 'base64')).metadata();
    expect(normalized).toMatchObject({ width: 440, height: 440, format: 'jpeg' });
  });

  it('falls back for missing, invalid, oversized and unreachable images', async () => {
    for (const response of [
      new Response(null, { status: 404 }),
      new Response('not an image', { headers: { 'Content-Type': 'text/html' } }),
      new Response('corrupt', { headers: { 'Content-Type': 'image/jpeg' } }),
      new Response('oversized', {
        headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '5000000' },
      }),
      new Response(new Uint8Array(4 * 1024 * 1024 + 1), {
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    ]) {
      expect(
        await recipeSharePhoto(photoUrl, origin, vi.fn<typeof fetch>().mockResolvedValue(response)),
      ).toBeNull();
    }
    expect(
      await recipeSharePhoto(
        photoUrl,
        origin,
        vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout')),
      ),
    ).toBeNull();
  });
});
