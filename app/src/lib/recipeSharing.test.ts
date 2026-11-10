import { describe, expect, it } from 'vitest';
import seed from '../../seed/recipes.json';
import { previewRecipesSchema } from './validation';
import { recipeCover, recipeIntro, recipeMetadata, recipeShareUrl } from './recipeSharing';

const recipe = previewRecipesSchema.parse([
  {
    ...seed.recipes[0],
    id: 'recipe-1',
    ingredients: [],
    steps: [],
    photos: [],
    cover_photo_id: null,
    created_at: '',
    updated_at: '2026-11-10T00:00:00Z',
  },
])[0];

describe('recipe sharing', () => {
  it('copies a stable revision link, preserving portions and replacing stale share revisions', () => {
    const url = new URL(
      recipeShareUrl(
        recipe,
        `https://www.grdn.recipes/r/${recipe.slug}?serves=4&share=old#ingredients`,
      ),
    );
    expect(url.origin).toBe('https://www.grdn.recipes');
    expect(url.pathname).toBe(`/r/${recipe.slug}`);
    expect(url.searchParams.get('serves')).toBe('4');
    expect(url.searchParams.getAll('share')).toHaveLength(1);
    expect(url.searchParams.get('share')).not.toBe('old');
    expect(url.hash).toBe('');
    expect(recipeShareUrl(recipe, url.href)).toBe(url.href);
    expect(recipeShareUrl({ ...recipe, updated_at: 'edited' }, url.href)).not.toBe(url.href);
    expect(
      recipeShareUrl(
        {
          ...recipe,
          photos: [
            {
              id: 'cover',
              recipe_id: recipe.id,
              storage_path: 'private-path',
              position: 0,
              caption: null,
              url: 'https://storage.example/?token=secret',
            },
          ],
        },
        url.href,
      ),
    ).not.toBe(url.href);
    expect(url.href).not.toContain('token=');
  });
  it('omits absent and filler introductions while keeping real recipe notes', () => {
    for (const intro of [
      null,
      '',
      '   ',
      'A recipe worth making again.',
      ' a recipe worth making again ',
    ])
      expect(recipeIntro({ intro })).toBeNull();
    expect(recipeIntro({ intro: '  Roasted squash with sage.  ' })).toBe(
      'Roasted squash with sage.',
    );
  });

  it('uses the selected cover, falling back to the first photo or no image', () => {
    const first = {
      id: 'first',
      recipe_id: recipe.id,
      storage_path: 'first',
      caption: null,
      position: 0,
    };
    const cover = { ...first, id: 'cover', position: 1 };
    expect(recipeCover({ photos: [first, cover], cover_photo_id: cover.id })).toBe(cover);
    expect(recipeCover({ photos: [first], cover_photo_id: 'deleted' })).toBe(first);
    expect(recipeCover(recipe)).toBeUndefined();
  });

  it('gives each recipe its own canonical URL, title and share image for both card formats', () => {
    const metadata = recipeMetadata({
      ...recipe,
      intro: null,
      type: 'Soups',
      servings: 6,
      yield_label: null,
      time_label: '45 min',
    });
    expect(metadata).toMatchObject({
      title: recipe.title,
      description: 'Soups · Serves 6 · 45 min',
      alternates: { canonical: `/r/${recipe.slug}` },
      openGraph: {
        title: recipe.title,
        url: `/r/${recipe.slug}`,
        images: [
          {
            url: expect.stringContaining(`/r/${recipe.slug}/share-image?v=`),
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: { title: recipe.title, card: 'summary_large_image' },
    });
    expect(metadata.openGraph?.images).toEqual(metadata.twitter?.images);
    expect(recipeMetadata({ ...recipe, slug: 'another-recipe' }).openGraph?.images).not.toEqual(
      metadata.openGraph?.images,
    );
  });

  it('changes the preview URL after recipe or cover edits without exposing signed storage URLs', () => {
    const original = recipeMetadata(recipe).openGraph?.images;
    expect(recipeMetadata({ ...recipe, updated_at: 'new-version' }).openGraph?.images).not.toEqual(
      original,
    );
    const withPhoto = {
      ...recipe,
      photos: [
        {
          id: 'new-cover',
          recipe_id: recipe.id,
          storage_path: 'private-path',
          caption: null,
          position: 0,
          url: 'https://storage.example/signed?token=private-token',
        },
      ],
    };
    const metadata = recipeMetadata(withPhoto);
    expect(metadata.openGraph?.images).not.toEqual(original);
    expect(JSON.stringify(metadata)).not.toContain('private-token');
    expect(JSON.stringify(metadata)).not.toContain('private-path');
  });
});
