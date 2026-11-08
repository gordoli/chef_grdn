# Verification

## Current build: Next.js and neutral liquid glass

The application now uses Next.js 16 App Router and React 19. Vite and React Router application code, SPA rewrites, the standalone Node API adapters and the Workbox plugin have been removed. Vitest remains the unit-test runner.

- Strict TypeScript, ESLint, Prettier and the production Next.js build pass.
- 114 unit tests pass across five files: quantities (41), recipe import (28), image import (32), owner authentication (7), and Next.js Route Handler authorization (6).
- `npm audit --omit=dev` reports zero vulnerabilities.
- Public recipe data is server-rendered using an anonymous Supabase client and a 60-second public-only cache. Private profiles, reviews and sessions are excluded.
- Next.js serves the metadata, installable manifest, self-hosted Poppins fonts and existing pixel-chef brand assets.

## Browser checks for the migration

- Search for salmon returns the matching recipe.
- The recipe sheet opens through native Next.js navigation; scaling from four servings to two updates the URL and shows two fillets, 1½ tbsp miso and two cups dashi.
- Anonymous Add navigation redirects to sign-in. Favorites persist and native Favorites navigation shows the saved recipe.
- The isolated preview creates, edits, reloads and deletes a temporary recipe. A direct editor reload preserves the saved title and ingredient text. Cleanup returns the preview to eight recipes.
- Desktop at 1280px and phones at 390px and 320px checked. No horizontal overflow at 320px. The first recipe begins around 417px from the top at 390px width, roughly 220px sooner than the original layout; the full first card is visible without scrolling.
- The mobile dock has Recipes, Favorites and Gallery in a left glass pill, with Add in a separate right bubble. Active states, touch areas, light/dark themes and neutral backgrounds are checked visually.
- Navigation uses a shared glass material with blur, highlights and layered shadows. Reduced-motion and reduced-transparency preferences retain usable controls.
- Browser console reported no application errors during the migration checks before loading the third-party Instagram frame.

## Existing connected data and security checks

All four Supabase migrations remain applied. Seeding twice left eight unique recipes (five Mains, three Soups), and this migration does not change recipe records or permissions. Recipe photos remain explicitly public-readable; reviews and profiles remain restricted to signed-in users. The Lasagna Soup source photo retains attribution.

The previous transactional database audit verified anonymous read-only access, owner-only recipe writes, friend-only own-review writes, isolated favorites and blocked role escalation. Temporary database users were rolled back. The full historical report is in `audit.md`.

The importer’s structured extraction, redirect validation, size/time limits and source-image validation are preserved. Next.js Route Handler tests ensure unauthenticated/friend callers cannot invoke the import services and verified owner identity reaches the services unchanged.

## Practical limits

Supabase’s production Auth redirect URLs still need to point to the live website before emailed sign-in links can open editing correctly; see SETUP.md. This does not affect public browsing. Unsupported recipe publishers use the manual editor. Instagram controls its public profile embed; the direct profile fallback remains available.
