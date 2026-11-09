import { createContext, useContext } from 'react';
import type { CookingStatus, Recipe, RecipePhoto, Review } from '@/lib/types';
export type RecipeInput = Omit<
  Recipe,
  | 'id'
  | 'slug'
  | 'created_at'
  | 'updated_at'
  | 'photos'
  | 'cover_photo_id'
  | 'sort_order'
  | 'cooking_status'
>;
interface RecipeState {
  recipes: Recipe[];
  reviews: Review[];
  favorites: string[];
  loading: boolean;
  hasLoadedClientData: boolean;
  error: string;
  isDemo: boolean;
  canEdit: boolean;
  refresh: () => Promise<void>;
  saveRecipe: (input: RecipeInput, id?: string) => Promise<Recipe>;
  deleteRecipe: (recipe: Recipe) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setCookingStatus: (id: string, status: CookingStatus) => Promise<void>;
  cookingStatusPending: string[];
  addPhotos: (recipeId: string, files: File[]) => Promise<void>;
  updatePhoto: (
    photo: RecipePhoto,
    change: Partial<Pick<RecipePhoto, 'caption' | 'position'>>,
  ) => Promise<void>;
  removePhoto: (photo: RecipePhoto) => Promise<void>;
  setCover: (recipeId: string, photoId: string) => Promise<void>;
  reorderPhotos: (recipeId: string, orderedIds: string[]) => Promise<void>;
  favoritePending: string[];
}
export const RecipeContext = createContext<RecipeState | null>(null);
export function useRecipes() {
  const value = useContext(RecipeContext);
  if (!value) throw new Error('useRecipes requires RecipeProvider');
  return value;
}
