import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.openai', 'reference', '.next', 'next-env.d.ts'] },
  js.configs.recommended,
  { files: ['**/*.mjs', '*.js'], languageOptions: { globals: globals.node } },
  { files: ['public/sw.js'], languageOptions: { globals: globals.serviceworker } },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
    },
  },
);
