export interface Item {
  raw: string;
  qty?: number | null;
  qty_max?: number;
  unit?: string;
  unit_max?: string;
  item?: string;
  note?: string;
  approx?: boolean;
  /** Transient display state; raw remains the original editor text. */
  scaled?: boolean;
}

export interface IngredientSection {
  section: string;
  items: Item[];
}

export interface StepSection {
  section: string;
  steps: string[];
}

export interface RecipePhoto {
  id: string;
  recipe_id: string;
  storage_path: string;
  caption: string | null;
  position: number;
  url?: string;
}

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  type: string;
  tags: string[];
  servings: number | null;
  yield_label: string | null;
  time_label: string | null;
  intro: string | null;
  source_url: string | null;
  source_label: string | null;
  notion_url: string | null;
  ingredients: IngredientSection[];
  steps: StepSection[];
  notes: string[];
  cover_photo_id: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  photos: RecipePhoto[];
}

export interface Review {
  id: string;
  recipe_id: string;
  author_id: string;
  rating: number;
  body: string | null;
  made_on: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
  display_name?: string;
  photo_url?: string;
}

export interface Profile {
  id: string;
  display_name: string;
  role: 'owner' | 'friend';
}
