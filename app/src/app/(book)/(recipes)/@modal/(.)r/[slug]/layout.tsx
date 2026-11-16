import type { ReactNode } from 'react';
import { RecipeDetailPanel } from '@/components/recipes/RecipeDetailPanel';
export default function Layout({ children }: { children: ReactNode }) {
  return <RecipeDetailPanel>{children}</RecipeDetailPanel>;
}
