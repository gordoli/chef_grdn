import { authenticateOwner } from '../../../../server/auth';
import { handleImport } from '../../../../server/import';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request: Request) {
  const auth = await authenticateOwner(request);
  return auth.error ?? handleImport(request, fetch, auth.userId);
}
