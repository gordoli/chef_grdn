// Handwritten from migrations 0001 and 0002; replace with Supabase-generated types after linking a project.
import type { CookingStatus, Profile, RecipePhoto, Review } from './types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RecipeRow = {
  id: string;
  slug: string;
  title: string;
  cooking_status: CookingStatus;
  type: string;
  tags: string[];
  servings: number | null;
  yield_label: string | null;
  time_label: string | null;
  intro: string | null;
  source_url: string | null;
  source_label: string | null;
  notion_url: string | null;
  ingredients: Json;
  steps: Json;
  notes: string[];
  cover_photo_id: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: { [Key in keyof Row]: Row[Key] };
  Insert: { [Key in keyof Insert]: Insert[Key] };
  Update: { [Key in keyof Update]: Update[Key] };
  Relationships: [];
};

type ProfileRow = Profile & { created_at: string };
type PhotoRow = Omit<RecipePhoto, 'url'> & { created_at: string };
type ReviewRow = Omit<Review, 'display_name' | 'photo_url'>;

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, 'id' | 'display_name'> & Partial<Omit<ProfileRow, 'id' | 'display_name'>>,
        Pick<Profile, 'display_name'>
      >;
      recipes: Table<
        RecipeRow,
        Pick<RecipeRow, 'slug' | 'title'> & Partial<Omit<RecipeRow, 'slug' | 'title'>>
      >;
      recipe_photos: Table<
        PhotoRow,
        Pick<PhotoRow, 'recipe_id' | 'storage_path'> &
          Partial<Omit<PhotoRow, 'recipe_id' | 'storage_path'>>
      >;
      reviews: Table<
        ReviewRow,
        Pick<ReviewRow, 'recipe_id' | 'rating'> & Partial<Omit<ReviewRow, 'recipe_id' | 'rating'>>
      >;
      favorites: Table<
        { user_id: string; recipe_id: string; created_at: string },
        { recipe_id: string; user_id?: string; created_at?: string }
      >;
    };
    Views: { [key: string]: never };
    Functions: {
      upsert_recipe: { Args: { r: Json }; Returns: string };
      is_owner: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
}
