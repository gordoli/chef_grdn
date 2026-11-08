import { useEffect, useState } from 'react';
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('grdn.theme', dark ? 'dark' : 'light');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#191c17' : '#fafaf7');
  }, [dark]);
  return { dark, toggleTheme: () => setDark((value) => !value) };
}
