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

## Restaurants (November 15, 2026)

Migration 0006 was applied to the connected Supabase database and 29 starter restaurant rows were seeded. The initial list is visited/favorite; Kevin’s Noodle House, Pang, Sam Tung, Four Kings, and Brothers are want-to-go. The user confirmed Dumpling Story on Fillmore and Amarin in Lafayette. Unknown personal ratings, dates, numeric prices, and unspecified chain branches were not invented. Website URLs in the seed identify photo/contact sources; map coordinates were resolved from the public US Census address geocoder.

The transactional `supabase/tests/restaurants.sql` passed against the live project: anonymous browsing, blocked anonymous and friend restaurant writes, private review reads, friend-authored review create/edit, blocked review impersonation and cross-account edits/deletes, owner edits and moderation, rating/status constraints, and cascading review cleanup. Temporary auth/profile/restaurant/review fixtures were rolled back; no invitations or messages were sent.

Browser checks covered the 390px mobile list, desktop list, want-to-go filtering, lazy map markers/attribution and missing-location links, detail navigation, editor fields/save in the isolated demo, photo-led details, and Videos-tab controls. A live-data restaurant page included the specific title, canonical, and revisioned OG image in the initial HTML head. Its generated 1200×630 PNG rendered successfully and was visually inspected. Missing restaurant images return 404; missing pages render the app's not-found page. The text-only preview path is available for missing/unavailable photos. Messaging-app cache behavior and platform-restricted social video playback remain controlled by those platforms.

## Restaurant refinements (November 16, 2026)

The current collection contains 26 restaurants: La Taq and El Faro were removed at the owner's request, and Dumpling Story is one entry with Mission and Pacific Heights locations. Migration 0007 preserves personal fields and reviews during the merge; prior branch URLs redirect to `/restaurants/dumpling-story`. Both branches retain their own map coordinates, address and phone. The editor supports up to twelve locations per restaurant. Favorite changes update only `is_favorite`, retaining unrelated edits and enforcing owner-only RLS. Transactional live checks cover favorite/location permissions and persistence.

The collection defaults to Been to, with Want to go and independent Favorites tabs. It has no All tab or sort dropdown. Cuisine uses a shared shadcn/Radix Select. Header search switches between recipes and restaurants; restaurant search matches every saved location. Neighborhoods appear beneath restaurant names, with favorite buttons positioned over thumbnails as sibling controls to avoid nested interactive links. Owner-provided photos were saved first in eight galleries. Numeric reported price ranges were found for 24 restaurants; source URLs, checked date and branch caveats are in `seed/restaurant-pricing-sources.json`. Noodle Panda and Dumpling Baby remain unpriced rather than receiving invented ranges. Google Maps was checked directly for Dumpling Baby's contact details and coordinates.

Browser checks confirmed the three tabs, cuisine selection, header restaurant search including Pacific Heights, Escape dismissal, separate Mission and Pacific Heights map markers, and thumbnail favorite toggling with persistence across reload in the isolated demo. The demo favorite was restored after testing. All five required checks pass, with 166 automated tests.

## Cached navigation and detail screens (November 16, 2026)

Noodle Panda and Dumpling Baby now use the owner's temporary $20–30 estimate in both the live database and seed/provenance files. Yelp API setup/importing is being handled in a separate chat.

Global headers are hidden on recipe/restaurant detail and edit paths while existing back/share controls remain. Navigation selection uses a measured sliding highlight with a reduced-motion fallback; main tab routes prefetch and the client router retains page segments for 60 seconds. Public restaurant reads now use a tagged 60-second server cache plus request-local deduplication. An owner-authenticated POST endpoint expires that cache immediately after collection mutations; private reviews and profiles are excluded. A bounded browser snapshot survives restaurant-provider remounts, coalesces concurrent requests, and prevents pre-mutation responses from overwriting newer edits. Server-provided collections no longer trigger an immediate duplicate browser fetch. Recipe focus refreshes are throttled, anonymous loads skip private profile/review queries, and sign-out clears private review state.

Automated checks cover cache expiry, concurrent-load deduplication, stale-response protection, retry after failure, detail-route matching, and anonymous/friend/owner cache invalidation boundaries. Browser checks verified that the highlight moves from the Restaurants position to Recipes with a 300ms transform transition and recipe detail pages contain no global header. Local request smoke checks returned 200 and showed warm collection/detail responses around 51–52ms after initial development compilation/database reads around 480–539ms. These local timings are observations, not production latency guarantees.
