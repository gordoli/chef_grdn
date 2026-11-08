'use client';
import { useSyncExternalStore } from 'react';
const themeEvent = 'grdn:theme';
function subscribe(callback: () => void) {
  window.addEventListener(themeEvent, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(themeEvent, callback);
    window.removeEventListener('storage', callback);
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
    localStorage.setItem('grdn.theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event(themeEvent));
  }
  return { dark, toggleTheme };
}
