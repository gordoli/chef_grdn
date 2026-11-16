import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import ipaddr from 'ipaddr.js';
import { publicWebsite } from '../src/lib/restaurants';

export class RestaurantImportError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
  }
}
export function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}
export type RestaurantResource = { bytes: Buffer; contentType: string; url: string };

/** Resolve every redirect and pin the validated address to the TLS request (no DNS rebinding). */
export async function fetchRestaurantResource(
  value: string,
  kind: 'html' | 'image' = 'html',
): Promise<RestaurantResource> {
  const signal = AbortSignal.timeout(kind === 'html' ? 12000 : 6000);
  let current = value;
  for (let redirect = 0; redirect <= 4; redirect++) {
    if (!publicWebsite(current))
      throw new RestaurantImportError('Use a public HTTPS restaurant website.');
    const url = new URL(current);
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true }),
      new Promise<never>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(new RestaurantImportError('The website took too long to respond.', 504)),
          { once: true },
        );
      }),
    ]);
    if (signal.aborted)
      throw new RestaurantImportError('The website took too long to respond.', 504);
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address)))
      throw new RestaurantImportError('That website address is not supported.');
    const pinned = addresses[0];
    const result = await new Promise<RestaurantResource & { redirect?: string }>(
      (resolve, reject) => {
        const req = request(
          url,
          {
            signal,
            method: 'GET',
            family: pinned.family,
            headers: {
              'User-Agent': 'ChefGRDN/1.0 (restaurant collection)',
              Accept: kind === 'html' ? 'text/html' : 'image/*',
              'Accept-Encoding': 'identity',
            },
            lookup: (_hostname, _options, callback) =>
              callback(null, pinned.address, pinned.family),
          },
          (response) => {
            const status = response.statusCode ?? 502;
            if ([301, 302, 303, 307, 308].includes(status)) {
              const location = response.headers.location;
              response.destroy();
              if (!location)
                return reject(
                  new RestaurantImportError('The website returned an invalid redirect.'),
                );
              resolve({
                bytes: Buffer.alloc(0),
                contentType: '',
                url: current,
                redirect: new URL(location, url).href,
              });
              return;
            }
            const contentType = String(response.headers['content-type'] ?? '')
              .split(';')[0]
              .trim()
              .toLowerCase();
            const limit = kind === 'html' ? 2 * 1024 * 1024 : 6 * 1024 * 1024;
            if (
              status < 200 ||
              status >= 300 ||
              !(kind === 'html'
                ? ['text/html', 'application/xhtml+xml'].includes(contentType)
                : ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(contentType))
            ) {
              response.destroy();
              reject(
                new RestaurantImportError(
                  'This website could not be imported. You can enter its details manually.',
                ),
              );
              return;
            }
            if (Number(response.headers['content-length']) > limit) {
              response.destroy();
              reject(new RestaurantImportError('The website response is too large.', 413));
              return;
            }
            const chunks: Buffer[] = [];
            let size = 0;
            response.on('data', (chunk: Buffer) => {
              size += chunk.length;
              if (size > limit) {
                response.destroy();
                reject(new RestaurantImportError('The website response is too large.', 413));
              } else chunks.push(chunk);
            });
            response.on('end', () =>
              resolve({ bytes: Buffer.concat(chunks), contentType, url: current }),
            );
            response.on('error', reject);
          },
        );
        req.on('error', reject);
        req.end();
      },
    );
    if (!result.redirect) return result;
    current = result.redirect;
  }
  throw new RestaurantImportError('The website redirected too many times.');
}
