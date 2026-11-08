import type { IncomingMessage, ServerResponse } from 'node:http';
type ApiRequest = IncomingMessage & { body?: unknown };
import { authenticateOwner } from '../server/auth.js';
import { handleImportImage } from '../server/image.js';

export default async function importImage(
  request: ApiRequest,
  response: ServerResponse,
): Promise<void> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const body: unknown = request.body;
  const webRequest = new Request(
    `https://${request.headers.host ?? 'localhost'}${request.url ?? '/api/import-image'}`,
    {
      method: request.method ?? 'POST',
      headers,
      ...(request.method !== 'GET' && request.method !== 'HEAD'
        ? {
            body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
          }
        : {}),
    },
  );
  const authentication = await authenticateOwner(webRequest);
  const result =
    authentication.error ?? (await handleImportImage(webRequest, fetch, authentication.userId));
  response.statusCode = result.status;
  result.headers.forEach((value, key) => response.setHeader(key, value));
  response.end(Buffer.from(await result.arrayBuffer()));
}
