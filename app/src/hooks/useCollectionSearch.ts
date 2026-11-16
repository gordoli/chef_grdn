'use client';

import {
  createContext,
  useContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';

type CollectionSearch = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  searchToggle: RefObject<HTMLButtonElement | null>;
};

export const CollectionSearchContext = createContext<CollectionSearch | null>(null);

export function useCollectionSearch() {
  const context = useContext(CollectionSearchContext);
  if (!context) throw new Error('Collection search requires the app layout.');
  return context;
}
