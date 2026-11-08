'use client';
import { useParams } from 'next/navigation';
import { useRecipes } from '@/hooks/useRecipes';
import { Button } from '@/components/ui/button';
import { RecipeEditor } from '@/views/RecipeEditor';
export function EditorRoute() {
  const { loading, hasLoadedClientData, error, refresh } = useRecipes();
  const { slug } = useParams<{ slug?: string }>();
  if (error)
    return (
      <div className="auth-state">
        <h1>Couldn’t open the editor.</h1>
        <p>{error}</p>
        <Button onClick={() => void refresh()}>Try again</Button>
      </div>
    );
  return loading || !hasLoadedClientData ? (
    <div className="page-loader">Opening your recipe…</div>
  ) : (
    <RecipeEditor key={slug ?? 'new'} />
  );
}
