export const themeStorageKey = 'grdn.theme';
export const themeChangeEvent = 'grdn:theme';
// Runs before first paint. Only this trusted constant is inserted as a script.
export const themeBootstrapScript = `try{const theme=localStorage.getItem('${themeStorageKey}');document.documentElement.classList.toggle('dark',theme==='dark'||(!theme&&matchMedia('(prefers-color-scheme: dark)').matches))}catch{}`;
