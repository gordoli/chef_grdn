import { authenticateOwner } from '../../../../server/auth';
import { handleTikTokImport } from '../../../../server/restaurantSocialImport';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const auth = await authenticateOwner(request, 'restaurant');
  return auth.error ?? handleTikTokImport(request, fetch, auth.userId);
}
