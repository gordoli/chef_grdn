import { Suspense, type ReactNode } from 'react';
import { BookShell } from '@/components/BookShell';
import { getPublicRecipes } from '@/lib/publicRecipes';
export default async function BookLayout({ children }: { children: ReactNode }) {
  const recipes = await getPublicRecipes();
  return (
    <Suspense fallback={<div className="page-loader">Opening your recipe book…</div>}>
      <BookShell initialRecipes={recipes}>{children}</BookShell>
    </Suspense>
  );
}
