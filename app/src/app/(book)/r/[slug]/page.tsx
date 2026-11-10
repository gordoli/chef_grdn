import { Home } from '@/views/Home';
import { RecipeDetail } from '@/views/RecipeDetail';
import type { Metadata } from 'next';
import { getPublicRecipes } from '@/lib/publicRecipes';
import { recipeMetadata } from '@/lib/recipeSharing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = (await getPublicRecipes()).find((item) => item.slug === slug);
  return recipe
    ? recipeMetadata(recipe)
    : {
        title: 'Recipe not found',
        robots: { index: false, follow: false },
        openGraph: { images: [] },
        twitter: { images: [] },
      };
}
export default function Page() {
  return (
    <>
      <Home />
      <RecipeDetail />
    </>
  );
}
