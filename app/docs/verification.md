# Verification

Verified on November 8, 2026.

## Automated

- TypeScript strict typecheck: passed.
- ESLint: passed with zero errors and zero warnings after splitting provider/hook exports.
- Vitest: 108 passing tests across four files: quantity/text boundaries (41), recipe import (28), image import (32), authentication (7).
- Production Vite build and PWA generation: passed.
- Production dependency audit: zero reported vulnerabilities. Four low-severity findings remain in build/lint tooling; no forced incompatible downgrade was applied.
- Brand generation: transparent master, PNG app sizes, PNG-backed ICO, Apple icon, separate maskable icon, and 1600×900 Poppins social preview generated and visually checked.

## Browser

Using the real running application and connected Supabase data:

- Public browsing returns eight recipes with no sign-in prompt.
- Search for salmon returns the matching title.
- Favorite action updates the heart and Favorites collection.
- Salmon portion control from four to two shows two fillets, 1½ tbsp white miso paste, and two cups dashi. URL carries `?serves=2`.
- Recipe sheet opens/closes with focus-managed Radix modal controls.
- Add route redirects an anonymous visitor to the editing sign-in screen.
- The separate preview creates, edits, reloads and deletes a recipe with an inline confirmation; the original eight remain after cleanup.
- Desktop at 1280px, phone at 390px, and narrow phone at 320px checked. Collection, list and editor have no horizontal overflow at 320px.
- Light and dark themes visually checked; screenshots are in the repository’s `docs/screenshots` directory.
- Gallery displays the attributed Lasagna Soup source photo. Instagram’s actual profile embed loads recent chef_grdn posts without a token. Instagram emits a non-fatal error from its own script; direct profile fallback is present.

## Connected database and importer

All migrations applied. Seeding twice leaves eight unique recipe slugs, five Mains and three Soups. Photo buckets are private with explicit public reads for recipe-photo objects only.

Transactional tests created temporary users then rolled everything back. Anonymous visitors can read recipes but cannot insert or update. Friends can update their own display name and review, cannot change profile roles or recipes, cannot write another person’s review, and cannot read another person’s favorites. Owner recipe editing and deleting another author’s review succeed. No temporary audit users remain, and no email was sent by these tests.

Live Lasagna Soup importing returned the title, ingredients, method, time and image URLs. Its first image downloaded as JPEG through the bounded image handler and was uploaded once to Supabase with source attribution.

## Practical limits

Production email delivery and magic-link redirect configuration require a live sign-in test after setting Supabase’s allowed production redirect URLs. Unit tests and transactional RLS checks do not claim to prove email delivery. Unsupported recipe sites, restricted social posts and publisher blocks use manual entry. An Instagram public profile embed is not a separately synchronized media API.
