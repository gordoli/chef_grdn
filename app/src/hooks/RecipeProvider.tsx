import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { signedPhotos, uploadRecipePhoto, resizePhoto, blobToDataUrl } from '@/lib/photos';
import { parseIngredientsText } from '@/lib/quantity';
import { parseStepsText } from '@/lib/recipeText';
import {
  ingredientSections,
  stepSections,
  toJson,
  previewRecipesSchema,
  favoriteIdsSchema,
} from '@/lib/validation';
import { errorMessage, slugify } from '@/lib/utils';
import type { CookingStatus, Recipe, RecipePhoto, Review } from '@/lib/types';
import { recipeCookingStatus } from '@/lib/recipeCollection';
import seed from '../../seed/recipes.json';
import { useSession } from './useSession';
import { RecipeContext, type RecipeInput } from './useRecipes';
function seedRecipes(): Recipe[] {
  return seed.recipes.map((r, index) => ({
    ...r,
    id: `preview-${index}`,
    ingredients: parseIngredientsText(r.ingredients_text),
    steps: parseStepsText(r.steps_text),
    photos: [],
    cover_photo_id: null,
    created_at: '2026-11-08T00:00:00Z',
    updated_at: '2026-11-08T00:00:00Z',
  }));
}
function readPreview(): Recipe[] {
  const saved = localStorage.getItem('grdn.preview.recipes');
  if (!saved) return seedRecipes();
  try {
    return previewRecipesSchema.parse(JSON.parse(saved));
  } catch {
    toast.error('Preview data could not be read. Loading the original recipes.');
    return seedRecipes();
  }
}
export function RecipeProvider({
  children,
  initialRecipes = [],
}: {
  children: ReactNode;
  initialRecipes?: Recipe[];
}) {
  const { profile, session } = useSession();
  const pathname = usePathname();
  const isDemo = pathname.startsWith('/demo');
  const canEdit = isDemo || profile?.role === 'owner';
  const [recipes, setRecipes] = useState<Recipe[]>(() => (isDemo ? seedRecipes() : initialRecipes));
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isDemo && initialRecipes.length === 0);
  const [error, setError] = useState('');
  const [hasLoadedClientData, setHasLoadedClientData] = useState(false);
  const refreshVersion = useRef(0);
  const favoriteRequests = useRef(new Set<string>());
  const [favoritePending, setFavoritePending] = useState<string[]>([]);
  const statusRequests = useRef(new Set<string>());
  const [cookingStatusPending, setCookingStatusPending] = useState<string[]>([]);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    if (isDemo) {
      setRecipes(readPreview());
      try {
        setFavorites(
          favoriteIdsSchema.parse(
            JSON.parse(localStorage.getItem('grdn.preview.favorites') ?? '[]'),
          ),
        );
      } catch {
        setFavorites([]);
      }
      setReviews([]);
      setLoading(false);
      setHasLoadedClientData(true);
      return;
    }
    if (!supabase) throw new Error('The recipe book connection is not configured.');
    const [recipeResult, photoResult, reviewResult, favoriteResult, profileResult] =
      await Promise.all([
        supabase.from('recipes').select('*').order('sort_order'),
        supabase.from('recipe_photos').select('*').order('position'),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
        session
          ? supabase.from('favorites').select('recipe_id')
          : Promise.resolve({ data: [], error: null }),
        supabase.from('profiles').select('id,display_name'),
      ]);
    for (const result of [recipeResult, photoResult, reviewResult, favoriteResult, profileResult])
      if (result.error) throw result.error;
    const photos = await signedPhotos(photoResult.data ?? []);
    const loaded = (recipeResult.data ?? []).map((r) => ({
      ...r,
      ingredients: ingredientSections.parse(r.ingredients),
      steps: stepSections.parse(r.steps),
      photos: photos.filter((p) => p.recipe_id === r.id),
    }));
    if (version !== refreshVersion.current) return;
    setRecipes(loaded);
    if (session) setFavorites((favoriteResult.data ?? []).map((f) => f.recipe_id));
    else {
      try {
        setFavorites(
          favoriteIdsSchema.parse(JSON.parse(localStorage.getItem('grdn.favorites') ?? '[]')),
        );
      } catch {
        setFavorites([]);
      }
    }
    const names = new Map((profileResult.data ?? []).map((p) => [p.id, p.display_name]));
    let loadedReviews: Review[] = (reviewResult.data ?? []).map((r) => ({
      ...r,
      display_name: names.get(r.author_id) ?? 'A friend',
    }));
    const paths = loadedReviews.flatMap((r) => (r.photo_path ? [r.photo_path] : []));
    if (paths.length) {
      const { data, error: signError } = await supabase.storage
        .from('review-photos')
        .createSignedUrls(paths, 3600);
      if (signError) throw signError;
      const urls = new Map((data ?? []).map((p) => [p.path, p.signedUrl]));
      loadedReviews = loadedReviews.map((r) => ({
        ...r,
        photo_url: r.photo_path ? (urls.get(r.photo_path) ?? undefined) : undefined,
      }));
    }
    if (version !== refreshVersion.current) return;
    setReviews(loadedReviews);
    setError('');
    setLoading(false);
    setHasLoadedClientData(true);
  }, [isDemo, session]);
  function invalidateRefresh() {
    refreshVersion.current++;
  }
  useEffect(() => {
    let active = true;
    refresh().catch((failure) => {
      if (active) {
        setError(errorMessage(failure));
        setLoading(false);
      }
    });
    const onFocus = () => void refresh().catch((failure) => setError(errorMessage(failure)));
    window.addEventListener('focus', onFocus);
    const timer = setInterval(onFocus, 50 * 60 * 1000);
    return () => {
      active = false;
      invalidateRefresh();
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [refresh]);
  function persistPreview(next: Recipe[]) {
    localStorage.setItem('grdn.preview.recipes', JSON.stringify(next));
    setRecipes(next);
  }
  async function saveRecipe(input: RecipeInput, id?: string): Promise<Recipe> {
    if (!canEdit) throw new Error('Only Gordon can edit recipes.');
    const existing = recipes.find((r) => r.id === id);
    const base = slugify(input.title);
    let slug = existing?.slug ?? base;
    let count = 2;
    while (recipes.some((r) => r.slug === slug && r.id !== id)) slug = `${base}-${count++}`;
    const now = new Date().toISOString();
    if (isDemo) {
      const result: Recipe = {
        ...input,
        id: id ?? crypto.randomUUID(),
        slug,
        cooking_status: existing ? recipeCookingStatus(existing) : 'to_try',
        photos: existing?.photos ?? [],
        cover_photo_id: existing?.cover_photo_id ?? null,
        sort_order: existing?.sort_order ?? recipes.length + 1,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      persistPreview(
        existing ? recipes.map((r) => (r.id === id ? result : r)) : [...recipes, result],
      );
      return result;
    }
    if (!supabase) throw new Error('Supabase is not configured.');
    const values = {
      ...input,
      slug,
      ingredients: toJson(input.ingredients),
      steps: toJson(input.steps),
      updated_at: now,
    };
    const query = id
      ? supabase.from('recipes').update(values).eq('id', id)
      : supabase.from('recipes').insert({ ...values, sort_order: recipes.length + 1 });
    const { data, error: failure } = await query.select().single();
    if (failure) throw failure;
    await refresh();
    return {
      ...data,
      ingredients: input.ingredients,
      steps: input.steps,
      photos: existing?.photos ?? [],
    };
  }
  async function deleteRecipe(recipe: Recipe) {
    if (!canEdit) throw new Error('Only Gordon can delete recipes.');
    if (isDemo) {
      persistPreview(recipes.filter((r) => r.id !== recipe.id));
      return;
    }
    if (!supabase) return;
    const recipePaths = recipe.photos.map((p) => p.storage_path);
    const reviewPaths = reviews
      .filter((r) => r.recipe_id === recipe.id)
      .flatMap((r) => (r.photo_path ? [r.photo_path] : []));
    // Remove files before cascading metadata; failures remain recoverable from the editor.
    for (const [bucket, paths] of [
      ['recipe-photos', recipePaths],
      ['review-photos', reviewPaths],
    ] as const) {
      if (paths.length) {
        const { error: failure } = await supabase.storage.from(bucket).remove([...paths]);
        if (failure) throw failure;
      }
    }
    const { error: failure } = await supabase.from('recipes').delete().eq('id', recipe.id);
    if (failure) throw failure;
    await refresh();
  }
  async function setCookingStatus(id: string, status: CookingStatus) {
    if (!canEdit) throw new Error('Only Gordon can change recipe status.');
    if (status !== 'made' && status !== 'to_try') throw new Error('Invalid recipe status.');
    if (statusRequests.current.has(id)) return;
    if (!recipes.some((recipe) => recipe.id === id)) throw new Error('Recipe not found.');
    statusRequests.current.add(id);
    setCookingStatusPending([...statusRequests.current]);
    try {
      const updated_at = new Date().toISOString();
      if (isDemo) {
        persistPreview(
          readPreview().map((recipe) =>
            recipe.id === id ? { ...recipe, cooking_status: status, updated_at } : recipe,
          ),
        );
      } else {
        if (!supabase) throw new Error('Supabase is not configured.');
        const { data, error: failure } = await supabase
          .from('recipes')
          .update({ cooking_status: status, updated_at })
          .eq('id', id)
          .select('cooking_status,updated_at')
          .single();
        if (failure) throw failure;
        invalidateRefresh();
        setRecipes((current) =>
          current.map((recipe) => (recipe.id === id ? { ...recipe, ...data } : recipe)),
        );
      }
    } finally {
      statusRequests.current.delete(id);
      setCookingStatusPending([...statusRequests.current]);
    }
  }
  async function toggleFavorite(id: string) {
    if (favoriteRequests.current.has(id)) return;
    favoriteRequests.current.add(id);
    setFavoritePending([...favoriteRequests.current]);
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(next);
    try {
      if (isDemo || !session)
        localStorage.setItem(
          isDemo ? 'grdn.preview.favorites' : 'grdn.favorites',
          JSON.stringify(next),
        );
      else if (supabase && session) {
        const { error: failure } = favorites.includes(id)
          ? await supabase
              .from('favorites')
              .delete()
              .eq('recipe_id', id)
              .eq('user_id', session.user.id)
          : await supabase.from('favorites').insert({ recipe_id: id, user_id: session.user.id });
        if (failure) throw failure;
      }
    } catch (failure) {
      setFavorites((current) =>
        favorites.includes(id)
          ? [...new Set([...current, id])]
          : current.filter((value) => value !== id),
      );
      throw failure;
    } finally {
      favoriteRequests.current.delete(id);
      setFavoritePending([...favoriteRequests.current]);
    }
  }
  async function addPhotos(recipeId: string, files: File[]) {
    if (!canEdit) throw new Error('Only Gordon can add photos.');
    const currentRecipes = isDemo ? readPreview() : recipes;
    const recipe = currentRecipes.find((r) => r.id === recipeId) ?? {
      id: recipeId,
      photos: [],
      cover_photo_id: null,
    };
    const photos: RecipePhoto[] = [];
    for (const file of files) {
      const position = Math.max(-1, ...recipe.photos.map((p) => p.position)) + 1 + photos.length;
      if (isDemo) {
        const url = await blobToDataUrl(await resizePhoto(file));
        photos.push({
          id: crypto.randomUUID(),
          recipe_id: recipeId,
          storage_path: 'preview',
          caption: file.name,
          position,
          url,
        });
      } else {
        photos.push(await uploadRecipePhoto(recipeId, file, position));
      }
    }
    if (isDemo) {
      persistPreview(
        currentRecipes.map((r) =>
          r.id === recipeId
            ? {
                ...r,
                photos: [...r.photos, ...photos],
                cover_photo_id: r.cover_photo_id ?? photos[0]?.id,
              }
            : r,
        ),
      );
    } else {
      if (!recipe.cover_photo_id && photos[0] && supabase) {
        const { error: failure } = await supabase
          .from('recipes')
          .update({ cover_photo_id: photos[0].id })
          .eq('id', recipeId);
        if (failure) throw failure;
      }
      await refresh();
    }
  }
  async function updatePhoto(
    photo: RecipePhoto,
    change: Partial<Pick<RecipePhoto, 'caption' | 'position'>>,
  ) {
    if (!canEdit) throw new Error('Owner access required.');
    if (isDemo) {
      persistPreview(
        readPreview().map((r) => ({
          ...r,
          photos: r.photos
            .map((p) => (p.id === photo.id ? { ...p, ...change } : p))
            .sort((a, b) => a.position - b.position),
        })),
      );
    } else if (supabase) {
      const { error: failure } = await supabase
        .from('recipe_photos')
        .update(change)
        .eq('id', photo.id);
      if (failure) throw failure;
      await refresh();
    }
  }
  async function removePhoto(photo: RecipePhoto) {
    if (!canEdit) throw new Error('Owner access required.');
    if (isDemo) {
      persistPreview(
        recipes.map((r) => ({
          ...r,
          photos: r.photos.filter((p) => p.id !== photo.id),
          cover_photo_id:
            r.cover_photo_id === photo.id
              ? (r.photos.find((p) => p.id !== photo.id)?.id ?? null)
              : r.cover_photo_id,
        })),
      );
    } else if (supabase) {
      const { error: storageError } = await supabase.storage
        .from('recipe-photos')
        .remove([photo.storage_path]);
      if (storageError) throw storageError;
      const { error: failure } = await supabase.from('recipe_photos').delete().eq('id', photo.id);
      if (failure) throw failure;
      const remaining =
        recipes.find((r) => r.id === photo.recipe_id)?.photos.filter((p) => p.id !== photo.id) ??
        [];
      for (const [position, item] of remaining.entries()) {
        const { error: positionError } = await supabase
          .from('recipe_photos')
          .update({ position })
          .eq('id', item.id);
        if (positionError) throw positionError;
      }
      const { error: coverError } = await supabase
        .from('recipes')
        .update({ cover_photo_id: remaining[0]?.id ?? null })
        .eq('id', photo.recipe_id);
      if (coverError) throw coverError;
      await refresh();
    }
  }
  async function reorderPhotos(recipeId: string, orderedIds: string[]) {
    if (!canEdit) throw new Error('Owner access required.');
    const current = isDemo ? readPreview() : recipes;
    const recipe = current.find((r) => r.id === recipeId);
    if (!recipe) throw new Error('Recipe not found.');
    if (
      orderedIds.length !== recipe.photos.length ||
      new Set(orderedIds).size !== orderedIds.length ||
      orderedIds.some((id) => !recipe.photos.some((p) => p.id === id))
    )
      throw new Error('Photo order changed. Reload and try again.');
    const ordered = orderedIds.map((id, position) => {
      const photo = recipe.photos.find((p) => p.id === id);
      if (!photo) throw new Error('Photo not found.');
      return { ...photo, position };
    });
    if (isDemo) {
      persistPreview(
        current.map((r) =>
          r.id === recipeId ? { ...r, photos: ordered, cover_photo_id: ordered[0]?.id ?? null } : r,
        ),
      );
      return;
    }
    if (!supabase) throw new Error('Supabase is not configured.');
    for (const photo of ordered) {
      const { error: failure } = await supabase
        .from('recipe_photos')
        .update({ position: photo.position })
        .eq('id', photo.id);
      if (failure) throw failure;
    }
    const { error: failure } = await supabase
      .from('recipes')
      .update({ cover_photo_id: ordered[0]?.id ?? null })
      .eq('id', recipeId);
    if (failure) throw failure;
    await refresh();
  }
  async function setCover(recipeId: string, photoId: string) {
    const recipe = (isDemo ? readPreview() : recipes).find((r) => r.id === recipeId);
    if (!recipe) throw new Error('Recipe not found.');
    await reorderPhotos(recipeId, [
      photoId,
      ...recipe.photos.filter((p) => p.id !== photoId).map((p) => p.id),
    ]);
  }

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        reviews,
        favorites,
        loading,
        hasLoadedClientData,
        error,
        isDemo,
        canEdit,
        refresh,
        saveRecipe,
        deleteRecipe,
        toggleFavorite,
        setCookingStatus,
        cookingStatusPending,
        addPhotos,
        updatePhoto,
        removePhoto,
        setCover,
        reorderPhotos,
        favoritePending,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}
