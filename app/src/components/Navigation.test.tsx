import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookOpen, Utensils } from 'lucide-react';
import { Navigation } from './Navigation';

const links = [
  { path: '/', label: 'Recipes', icon: BookOpen },
  { path: '/restaurants', label: 'Restaurants', icon: Utensils },
];
describe('initial navigation HTML', () => {
  it.each(['/', '/index'])(
    'has a visible Recipes fallback before client measurement at %s',
    (pathname) => {
      const html = renderToStaticMarkup(
        <Navigation links={links} prefix="" pathname={pathname} mobile />,
      );
      expect(html).toContain('data-sliding="false"');
      expect(html).toContain('aria-current="page" class="mobile-nav-link active"');
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      expect(html).not.toContain('class="navigation-highlight"');
    },
  );
});
