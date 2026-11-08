import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleImportImage, isAllowedImageUrl } from './image';

const imageUrl = 'https://tastesbetterfromscratch.com/wp-content/uploads/soup.jpg';
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]);
const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const webpBytes = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]);
function request(body: unknown = { url: imageUrl }): Request {
  return new Request('https://chef-grdn.example/api/import-image', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function fetchImage(bytes = jpegBytes, mime = 'image/jpeg'): typeof fetch {
  return vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response(bytes, { headers: { 'content-type': mime } }));
}
function run(body: unknown, fetcher: typeof fetch = fetchImage()): Promise<Response> {
  return handleImportImage(request(body), fetcher, crypto.randomUUID());
}
afterEach(() => vi.useRealTimers());

describe('source image URL boundaries', () => {
  it('permits exact recipe publishers and known image CDNs', () => {
    expect(isAllowedImageUrl(imageUrl)).toBe(true);
    expect(isAllowedImageUrl('https://images.immediate.co.uk/image.jpg')).toBe(true);
    expect(isAllowedImageUrl('https://food.fnr.sndimg.com/image.jpg')).toBe(true);
  });
  it.each([
    'http://tastesbetterfromscratch.com/soup.jpg',
    'https://localhost/soup.jpg',
    'https://127.0.0.1/soup.jpg',
    'https://[::1]/soup.jpg',
    'https://169.254.169.254/image',
    'https://10.0.0.1/image',
    'https://172.16.0.1/image',
    'https://192.168.1.1/image',
    'https://tastesbetterfromscratch.com.evil.example/image',
    'https://evil.images.immediate.co.uk/image',
    'https://user:password@tastesbetterfromscratch.com/image',
    'https://images.immediate.co.uk:8080/image',
    'https://images.immediate.co.uk/image#fragment',
    'data:image/jpeg;base64,AAA=',
    'file:///etc/passwd',
  ])('rejects forbidden source %s', (value) => expect(isAllowedImageUrl(value)).toBe(false));
});

describe('image importing', () => {
  it.each([
    [jpegBytes, 'image/jpeg'],
    [pngBytes, 'image/png'],
    [webpBytes, 'image/webp'],
  ] as const)('returns allowed image bytes with verified mime %s', async (bytes, mime) => {
    const response = await run({ url: imageUrl }, fetchImage(bytes, mime));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(mime);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });
  it('rejects invalid request bodies and forbidden hosts without fetching', async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const body of [{}, { url: 3 }, { url: 'https://localhost/image.jpg' }]) {
      expect((await run(body, fetcher)).status).toBeGreaterThanOrEqual(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('validates redirect destinations before fetching them', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://169.254.169.254/secret.jpg' },
      }),
    );
    expect((await run({ url: imageUrl }, fetcher)).status).toBe(422);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe('manual');
  });
  it('follows supported publisher redirects to a known CDN', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: 'https://images.immediate.co.uk/soup.jpg' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(jpegBytes, { headers: { 'content-type': 'image/jpeg' } }),
      );
    expect((await run({ url: imageUrl }, fetcher)).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('caps redirect chains', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(null, { status: 302, headers: { location: '/loop' } }),
      );
    expect((await run({ url: imageUrl }, fetcher)).status).toBe(422);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it.each(['image/svg+xml', 'text/html', 'application/octet-stream', 'image/gif'])(
    'rejects unsafe or unsupported content type %s',
    async (mime) => {
      expect((await run({ url: imageUrl }, fetchImage(jpegBytes, mime))).status).toBe(422);
    },
  );
  it('rejects HTML disguised as a PNG and mismatched image signatures', async () => {
    const htmlBytes = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
    expect((await run({ url: imageUrl }, fetchImage(htmlBytes, 'image/png'))).status).toBe(422);
    expect((await run({ url: imageUrl }, fetchImage(jpegBytes, 'image/webp'))).status).toBe(422);
  });
  it('rejects both declared and streamed oversized images before returning a Vercel payload', async () => {
    const declared = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(jpegBytes, {
        headers: { 'content-type': 'image/jpeg', 'content-length': '9000000' },
      }),
    );
    expect((await run({ url: imageUrl }, declared)).status).toBe(413);
    const streamed = fetchImage(new Uint8Array(4 * 1024 * 1024 + 1));
    expect((await run({ url: imageUrl }, streamed)).status).toBe(413);
  });
  it('enforces the complete download timeout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise<Response>(() => {}));
    const result = run({ url: imageUrl }, fetcher);
    await vi.advanceTimersByTimeAsync(12_000);
    expect((await result).status).toBe(504);
  });
  it('bounds image downloads by verified owner identity', async () => {
    const identity = crypto.randomUUID();
    const fetcher = fetchImage();
    for (let index = 0; index < 12; index++) {
      expect((await handleImportImage(request(), fetcher, identity)).status).toBe(200);
    }
    expect((await handleImportImage(request(), fetcher, identity)).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(12);
  });
  it('returns an actionable error if the source fails', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private network details'));
    const response = await run({ url: imageUrl }, fetcher);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private network details');
  });
});
