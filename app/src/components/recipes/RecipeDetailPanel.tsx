'use client';

import { useParams, useSelectedLayoutSegments } from 'next/navigation';
import { createContext, useContext, type ReactNode } from 'react';
import { DetailPanel } from '@/components/ui/detail-panel';
import { useRecipes } from '@/hooks/useRecipes';

const CollectionBackdropContext = createContext(false);

/** An unmatched collection slot has no list to return to (for example, after editing). */
export function RecipeCollectionLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  const segments = useSelectedLayoutSegments();
  const hasCollection = segments.length === 0 || segments[0] === 'favorites';
  return (
    <CollectionBackdropContext.Provider value={hasCollection}>
      {children}
      {modal}
    </CollectionBackdropContext.Provider>
  );
}

export function RecipeDetailPanel({
  children,
  navigation,
}: {
  children: ReactNode;
  navigation?: 'back' | 'replace';
}) {
  const { slug } = useParams<{ slug: string }>();
  const { recipes, isDemo } = useRecipes();
  const hasCollection = useContext(CollectionBackdropContext);
  return (
    <DetailPanel
      title={recipes.find((recipe) => recipe.slug === slug)?.title ?? 'Recipe'}
      collectionPath={`${isDemo ? '/demo' : ''}/`}
      navigation={navigation ?? (hasCollection ? 'back' : 'replace')}
    >
      {children}
    </DetailPanel>
  );
}
