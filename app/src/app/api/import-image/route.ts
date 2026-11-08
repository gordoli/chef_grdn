import { authenticateOwner } from '../../../../server/auth';
import { handleImportImage } from '../../../../server/image';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request: Request) {
  const auth = await authenticateOwner(request);
  return auth.error ?? handleImportImage(request, fetch, auth.userId);
}
