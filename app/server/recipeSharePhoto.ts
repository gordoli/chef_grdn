import sharp from 'sharp';

const MAX_BYTES = 4 * 1024 * 1024;

/** Only the public portfolio's signed recipe-photo objects may be fetched. */
export async function recipeSharePhoto(
  value: string | undefined,
  storageOrigin: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!value || !storageOrigin) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.origin !== new URL(storageOrigin).origin ||
      url.username ||
      url.password ||
      url.hash ||
      !url.pathname.startsWith('/storage/v1/object/sign/recipe-photos/')
    )
      return null;
    const response = await fetcher(url.href, {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (
      !response.ok ||
      !/^image\/(jpeg|png|webp)(;|$)/i.test(response.headers.get('content-type') ?? '') ||
      Number(response.headers.get('content-length')) > MAX_BYTES
    ) {
      await response.body?.cancel();
      return null;
    }
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        length += chunk.byteLength;
        if (length > MAX_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    const photo = await sharp(Buffer.concat(chunks), { limitInputPixels: 16_000_000 })
      .rotate()
      .resize(440, 440, { fit: 'cover' })
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${photo.toString('base64')}`;
  } catch {
    // Missing, expired or invalid images still get a usable, branded preview.
    return null;
  }
}
