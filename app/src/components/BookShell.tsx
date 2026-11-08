'use client';
import type { ReactNode } from 'react';
import { AuthGate } from '@/hooks/SessionProvider';
import { RecipeProvider } from '@/hooks/RecipeProvider';
import { Layout } from './Layout';
import type { Recipe } from '@/lib/types';
export function BookShell({
  children,
  initialRecipes,
}: {
  children: ReactNode;
  initialRecipes: Recipe[];
}) {
  return (
    <AuthGate>
      <RecipeProvider initialRecipes={initialRecipes}>
        <Layout>{children}</Layout>
      </RecipeProvider>
    </AuthGate>
  );
}
