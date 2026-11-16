'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRecipes } from '@/hooks/useRecipes';
import { useSession } from '@/hooks/useSession';
import { RecipeEditor } from '@/views/RecipeEditor';

/** Keep query-driven sheet state inside its own Suspense boundary, preserving collection HTML. */
export function RecipeAddFlow() {
  const { canEdit } = useRecipes();
  const { loading } = useSession();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (params.get('add') !== '1' || !canEdit) return;
    setOpen(true);
    const query = new URLSearchParams(params.toString());
    query.delete('add');
    router.replace(`${pathname}${query.size ? `?${query}` : ''}`, { scroll: false });
  }, [params, canEdit, pathname, router]);
  return (
    <>
      {params.get('add') === '1' && !canEdit && !loading && (
        <p className="restaurant-empty">
          <Link href="/sign-in">Sign in as the owner</Link> to add a recipe.
        </p>
      )}
      {open && <RecipeEditor open={open} onOpenChange={setOpen} />}
    </>
  );
}
