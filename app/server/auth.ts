import { createClient } from '@supabase/supabase-js';

export type OwnerAuthentication =
  { userId: string; error?: never } | { userId?: never; error: Response };

function denied(message: string, status: number): OwnerAuthentication {
  return {
    error: Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } }),
  };
}

/** The verified Supabase user and database role are the only authority for imports. */
export async function authenticateOwner(request: Request): Promise<OwnerAuthentication> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return denied('Sign in to import a recipe.', 401);
  const projectUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !publishableKey) return denied('Recipe importing is not configured yet.', 503);
  try {
    const client = createClient(projectUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser(token);
    if (authError || !user)
      return denied('Your session expired. Sign in again to import a recipe.', 401);
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError)
      return denied('Recipe book access is not ready. Check the database setup.', 503);
    if (profile?.role !== 'owner')
      return denied('Only the recipe book owner can import recipes.', 403);
    return { userId: user.id };
  } catch {
    return denied('Recipe book authentication could not be reached. Please try again.', 503);
  }
}
