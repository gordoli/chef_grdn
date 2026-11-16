'use client';
import { useSyncExternalStore } from 'react';
import { themeChangeEvent, themeStorageKey } from '@/theme/theme';
function subscribe(callback: () => void) {
  const syncStorage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey && event.key !== null) return;
    const preference = event.newValue;
    document.documentElement.classList.toggle(
      'dark',
      preference === 'dark' || (!preference && matchMedia('(prefers-color-scheme: dark)').matches),
    );
    callback();
  };
  window.addEventListener(themeChangeEvent, callback);
  window.addEventListener('storage', syncStorage);
  return () => {
    window.removeEventListener(themeChangeEvent, callback);
    window.removeEventListener('storage', syncStorage);
  };
}
function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}
export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  function toggleTheme() {
    const next = !getSnapshot();
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(themeStorageKey, next ? 'dark' : 'light');
    } catch {
      /* The theme still works when browser storage is unavailable. */
    }
    window.dispatchEvent(new Event(themeChangeEvent));
  }
  return { dark, toggleTheme };
}
