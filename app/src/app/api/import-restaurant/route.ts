import { authenticateOwner } from '../../../../server/auth';
import { handleRestaurantImport } from '../../../../server/restaurantImport';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request: Request) {
  const auth = await authenticateOwner(request, 'restaurant');
  return auth.error ?? handleRestaurantImport(request, fetch, auth.userId);
}
