import { revalidateTag } from 'next/cache';
import { authenticateOwner } from '../../../../../server/auth';
export async function POST(request: Request) {
  const auth = await authenticateOwner(request, 'restaurant');
  if (auth.error) return auth.error;
  revalidateTag('public-restaurant-portfolio', { expire: 0 });
  return Response.json({ refreshed: true }, { headers: { 'Cache-Control': 'no-store' } });
}
