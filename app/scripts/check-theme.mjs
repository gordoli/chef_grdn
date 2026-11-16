import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return cssFiles(path);
      return path.endsWith('.css') && path !== join('src', 'theme', 'tokens.css') ? [path] : [];
    }),
  );
  return files.flat();
}
const issues = [];
for (const path of await cssFiles('src')) {
  const css = (await readFile(path, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)[;}]/g)) {
    const [, property, value] = match;
    const rawVisualSize =
      /^(?:font-size|border-radius|(?:margin|padding)(?:-.+)?|(?:row-|column-)?gap)$/.test(
        property,
      ) && /\d(?:px|rem|em)\b/.test(value);
    const rawColor =
      !path.startsWith(join('src', 'theme')) && /#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i.test(value);
    const rawDuration = /^(?:transition|animation)/.test(property) && /\d(?:ms|s)\b/.test(value);
    if (rawVisualSize || rawColor || rawDuration)
      issues.push(`${path}: ${property}: ${value.trim()}`);
  }
}
if (issues.length) {
  console.error('Use src/theme tokens for feature styles:\n' + issues.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    'Theme check passed: feature colors, spacing, typography, rounding and motion use tokens.',
  );
