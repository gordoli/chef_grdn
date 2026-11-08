import { isAllowedRecipeUrl } from './import.js';

// Vercel responses are limited to 4.5MB; stay below that limit before sending bytes.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = 4096;
const IMAGE_TIMEOUT_MS = 12_000;
const IMAGE_HOSTS = new Set([
  'images.immediate.co.uk',
  'food.fnr.sndimg.com',
  'assets.bonappetit.com',
  'assets.epicurious.com',
  'assets.delish.com',
  'hips.hearstapps.com',
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
]);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

class ImageImportError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = 'ImageImportError';
  }
}

/** Only publisher domains and exact, known image CDN hosts can receive requests. */
export function isAllowedImageUrl(value: string): boolean {
  if (isAllowedRecipeUrl(value)) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (!url.port || url.port === '443') &&
      IMAGE_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function assertImageUrl(value: string): URL {
  if (!isAllowedImageUrl(value)) {
    throw new ImageImportError(
      'This image host is not supported. Save the image from the original recipe and upload it instead.',
    );
  }
  return new URL(value);
}

async function boundedBytes(
  source: Request | Response,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declaredLength = Number(source.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    await source.body?.cancel();
    throw new ImageImportError(
      'This image is too large to import automatically. Download it and upload it instead.',
      413,
    );
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  const reader = source.body?.getReader();
  if (!reader) return new Uint8Array();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new ImageImportError(
          'This image is too large to import automatically. Download it and upload it instead.',
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function matchesImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (mime === 'image/webp') {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  }
  return false;
}

async function fetchImage(
  urlValue: string,
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<Response> {
  let url = assertImageUrl(urlValue);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const upstream = await fetcher(url.href, {
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'image/jpeg,image/png,image/webp',
        'User-Agent': 'ChefGRDN-RecipeImporter/1.0',
      },
    });
    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      const location = upstream.headers.get('location');
      await upstream.body?.cancel();
      if (!location || redirects === 3)
        throw new ImageImportError(
          'The source image redirected too many times. Upload it manually.',
        );
      url = assertImageUrl(new URL(location, url).href);
      continue;
    }
    const mime =
      (upstream.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!upstream.ok || !IMAGE_MIMES.has(mime)) {
      await upstream.body?.cancel();
      throw new ImageImportError(
        'The source did not provide a JPEG, PNG, or WebP image. Upload a photo instead.',
      );
    }
    const bytes = await boundedBytes(upstream, MAX_IMAGE_BYTES);
    if (!matchesImageSignature(bytes, mime)) {
      throw new ImageImportError(
        'The downloaded file is not a valid JPEG, PNG, or WebP image. Upload a photo instead.',
      );
    }
    return new Response(bytes, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'attachment; filename="recipe-image"',
      },
    });
  }
  throw new ImageImportError('This image could not be imported.');
}

async function downloadImage(url: string, fetcher: typeof fetch): Promise<Response> {
  assertImageUrl(url);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new ImageImportError(
          'The image took too long to download. Try again or upload a photo instead.',
          504,
        ),
      );
    }, IMAGE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fetchImage(url, fetcher, controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Private, authenticated requests are additionally bounded within each running instance.
const imageWindows = new Map<string, { starts: number; count: number }>();
function consumeImageQuota(identity: string): boolean {
  const now = Date.now();
  for (const [key, window] of imageWindows)
    if (now - window.starts >= 60_000) imageWindows.delete(key);
  const window = imageWindows.get(identity);
  if (window && window.count >= 12) return false;
  if (window) window.count++;
  else {
    if (imageWindows.size >= 500) return false;
    imageWindows.set(identity, { starts: now, count: 1 });
  }
  return true;
}

function jsonError(error: string, status: number): Response {
  return Response.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  );
}

/** The API adapter verifies the owner and passes the verified user ID for quota enforcement. */
export async function handleImportImage(
  request: Request,
  fetcher: typeof fetch = fetch,
  identity = 'local-development',
): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Use POST to import a recipe image.', 405);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return jsonError('Send a JSON image link.', 415);
  if (!consumeImageQuota(identity))
    return jsonError('Please wait one minute before importing more images.', 429);
  try {
    const raw = new TextDecoder().decode(await boundedBytes(request, MAX_REQUEST_BYTES));
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError('Send a valid JSON image link.', 400);
    }
    if (
      typeof body !== 'object' ||
      body === null ||
      !('url' in body) ||
      typeof body.url !== 'string' ||
      body.url.length > 2048
    ) {
      return jsonError('Enter a valid source image link.', 400);
    }
    return await downloadImage(body.url, fetcher);
  } catch (error) {
    if (error instanceof ImageImportError) return jsonError(error.message, error.status);
    return jsonError(
      'The source image could not be reached. Try again or upload a photo instead.',
      502,
    );
  }
}
