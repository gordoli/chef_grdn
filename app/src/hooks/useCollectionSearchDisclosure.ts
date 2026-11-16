'use client';
import { useEffect, useRef } from 'react';
import { useCollectionSearch } from './useCollectionSearch';

/** The two collection pages share focus, outside-click and cleanup behavior. */
export function useCollectionSearchDisclosure() {
  const state = useCollectionSearch();
  const { searchOpen, setSearchOpen, setSearch, searchToggle } = state;
  const searchRegion = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!searchOpen) return;
    searchInput.current?.focus({ preventScroll: true });
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchRegion.current?.contains(target) && !searchToggle.current?.contains(target)) {
        setSearchOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, [searchOpen, searchToggle, setSearch, setSearchOpen]);
  return { ...state, searchRegion, searchInput };
}
