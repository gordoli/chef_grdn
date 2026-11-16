'use client';

import {
  createContext,
  useContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';

type RecipeSearch = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  searchToggle: RefObject<HTMLButtonElement | null>;
};

export const RecipeSearchContext = createContext<RecipeSearch | null>(null);

export function useRecipeSearch() {
  const context = useContext(RecipeSearchContext);
  if (!context) throw new Error('Recipe search requires the app layout.');
  return context;
}
