import type { Metadata } from 'next';
import type { Recipe } from './types';
import { recipeTypeLabel } from './recipeCollection';

export function recipeIntro(recipe: Pick<Recipe, 'intro'>): string | null {
  const intro = recipe.intro?.trim();
  return intro && !/^a recipe worth making again[.!]?$/i.test(intro) ? intro : null;
}

export function recipeCover(recipe: Pick<Recipe, 'photos' | 'cover_photo_id'>) {
  return recipe.photos.find((photo) => photo.id === recipe.cover_photo_id) ?? recipe.photos[0];
}

export function recipeMetadata(recipe: Recipe): Metadata {
  const path = `/r/${encodeURIComponent(recipe.slug)}`;
  const version = `${recipe.updated_at}-${recipeCover(recipe)?.id ?? 'no-photo'}`;
  const description =
    recipeIntro(recipe) ??
    [
      recipeTypeLabel(recipe.type),
      recipe.yield_label || (recipe.servings ? `Serves ${recipe.servings}` : null),
      recipe.time_label,
    ]
      .filter(Boolean)
      .join(' · ');
  const image = {
    url: `${path}/share-image?v=${encodeURIComponent(version)}`,
    width: 1200,
    height: 630,
    alt: `${recipe.title} · Chef GRDN`,
  };
  return {
    title: recipe.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: recipe.title,
      description,
      url: path,
      siteName: 'Chef GRDN',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: recipe.title, description, images: [image] },
  };
}
