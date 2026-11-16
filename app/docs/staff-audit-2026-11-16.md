# Chef GRDN staff audit — November 16, 2026

## Scope

- Audit mode: `repo`, including the current working tree.
- Compared refs/range: full repository at `726cf732a4d5a02f2dcce6b006ce2e690ceea75e`, plus uncommitted restaurant/import, Roll, thumbnail, and audit changes.
- Snapshot file: `.openai/audit/repo-snapshot.json` (local, ignored). The tracked-file snapshot identified 145 code files and heuristic hotspots; new working-tree files were reviewed separately. Lockfiles, historical HTML, and repeated exports were excluded from defect conclusions.
- Date: November 16, 2026.
- Method: machine snapshot, manual review of server imports, auth/session lifecycle, persistence, RLS, caches, editor state, navigation, images, gestures and theme ownership; unit/business tests, SQL permission checks, production compilation, and browser checks.

## Executive Summary

- Overall status: **healthy for the current single-owner portfolio scope**, with bounded verification.
- No confirmed P0 or outstanding P1 release blocker was found in the reviewed scope after the fixes below. The app retains clear server, persistence, pure-domain and presentation boundaries. The most useful improvements were smaller restaurant thumbnails, coordinated import polling, live-session owner gates, a simpler editor, and a documented theme with automated CSS checks. This is not a security certification or a claim of perfect performance on every device. Native-device motion testing, field performance measurements, and future collection growth remain follow-up work.

## High-Level Change Description

- Restaurant editing now follows Main details (including locations), Gallery, Your experience, Social links. Want-to-go places skip the experience step. The gallery has explicit thumbnail selection, photo inclusion, and an automatic first-photo default.
- Nullable `restaurants.thumbnail_url` preserves old records and selected covers across later imports. The picker retains its order while cover-first presentation is used on the board, detail and share image.
- Roll is reached through the dice action beside the restaurant list/map controls. Main navigation remains Recipes, Gallery, Restaurants.
- Editor state/import coordination moved to a hook, save preparation to pure functions, and global styles to ordered `src/theme` files. HTTP and credentials remain server-side; providers retain persistence responsibility.

## Wins

- **Loading:** allowlisted Yelp images now receive appropriate Next.js thumbnail/preview sizes and reserved frames, with original-image and placeholder fallbacks (`components/restaurants/RestaurantPhoto.tsx`, `theme/media.ts`, `next.config.ts`). One local sample dropped from 28,146-byte JPEG to 4,074-byte WebP, about 85.5% fewer image bytes. This is one image, not a whole-page benchmark.
- **Import reliability:** Yelp business/review progress checks run concurrently. Completed payloads are downloaded once both jobs are ready, avoiding repeated business downloads during review polling. Requests and payloads remain bounded (`server/restaurantSocialImport.ts`, `src/config/loading.ts`, `server/restaurantYelp.test.ts`).
- **Cache ownership:** anonymous collections share explicit freshness policies, request-local/server caching, and concurrent browser fetch deduplication. Private reviews do not enter the public snapshot (`lib/publicRecipes.ts`, `lib/publicRestaurants.ts`, `hooks/restaurantCache.ts`).
- **Permissions:** owner controls require a live session matching the owner profile; sign-out clears stale profile state. Server owner checks and RLS remain authoritative (`lib/auth.ts`, `hooks/SessionProvider.tsx`, both collection providers). Thumbnail SQL checks confirm anonymous/friend writes are denied and owner writes preserve personal data (`supabase/tests/restaurant_yelp.sql`, run transactionally with rollback).
- **Editor integrity:** pure candidate construction covers photo exclusion, stable cover selection, step/error routing, website merge behavior, and preservation of personal/other-branch data (`lib/restaurantEditor.ts`, `.test.ts`). Demo state waits for local restoration instead of flashing the seed cover.
- **Visual consistency:** spacing, type, rounding, semantic colors, branding and motion have a theme home and documented roles. Lint enforces CSS token use for the covered properties (`theme/tokens.css`, `theme/STYLE_GUIDE.md`, `scripts/check-theme.mjs`). Mobile form controls use readable 16px text; tiny labels were normalized to at least the 11px caption scale.
- **Motion:** wizard height/footer position and gallery ordering remain stable. The navigation has an initial active-state fallback and clears its highlight when no main tab is selected. Recipe dismissal reads its fallback duration from CSS. Reduced-motion/transparency rules remain in place (`theme/motion.css`, `theme/motion.ts`, `hooks/useRecipePanel.ts`, `components/Navigation.tsx`).
- **Shared behavior:** collection-search disclosure, share-image assets/canvas values, gesture thresholds and operational loading policies now have explicit owners. Cross-tab theme changes also update the document class (`hooks/useCollectionSearchDisclosure.ts`, `server/shareAssets.ts`, `theme/shareCard.ts`, `theme/gestures.ts`, `hooks/useTheme.ts`).

## Losses

- **Maintainability:** moving the existing cascade into ordered theme files preserves compatibility but retains some legacy selectors. It is more navigable, not a complete deletion of historical CSS (`theme/restaurants.css`, `theme/responsive.css`, `theme/restaurant-layout.css`).
- **Performance headroom:** public providers still carry complete portfolio records, including bounded review metadata. This is reasonable for 29 restaurants and 13 recipes; there is no measured threshold proving where it stops being reasonable (`lib/publicRestaurants.ts`, `hooks/RestaurantProvider.tsx`, `hooks/RecipeProvider.tsx`).
- **Verification:** browser flows were exercised manually, not captured in a committed browser end-to-end suite. Native Safari/Android behavior and real-user LCP/CLS/INP were not measured. The CSS guard does not validate every Tailwind utility or inline geometry.

## DRY/KISS/YAGNI/SOLID Assessment

### DRY

- Shared search lifecycle and share-image assets were real duplication and are now shared. Loading and gesture rules have one named owner.
- Recipe and restaurant providers share concepts but have different schemas, media and permission lifecycles. A generic collection-provider framework would obscure those differences; no such framework was added.
- CSS and TypeScript export colors necessarily use different consumers; `theme/palette.test.ts` checks the mirrored semantic colors against CSS.

### KISS

- The editor view now composes screens; the hook coordinates state and effects; pure functions prepare validated data. No workflow engine or general form framework was introduced.
- A nullable URL is sufficient for cover selection. It avoids a separate photo-ranking table or rewriting gallery order when a radio is selected.
- Physical geometry, schema limits and operational budgets remain named values in appropriate files. Turning every `0`, border or aspect ratio into a design token would reduce clarity.

### YAGNI

- No new dependency, distributed queue, pagination framework, or design-system package was required for this work.
- Distributed quotas and summary/detail payload separation should follow actual multi-owner usage or measured growth, rather than being added speculatively.

### SOLID

- Responsibilities follow the existing architecture: HTTP/provider security in `server`, state/persistence in hooks, pure transforms in `lib`, composition in views/components, presentation policy in `theme`.
- The editor no longer combines its largest import/save decisions with JSX. External payloads still cross a validated schema boundary.
- Larger recipe/detail components remain domain-cohesive. Further extraction should follow repeated behavior or a specific testing need, not line-count targets.

## Potential Breaking Changes

- Apply migration `0010_restaurant_thumbnail.sql` before deploying code that writes `thumbnail_url`. It has been applied to the current Supabase project. Existing rows default to `null`; older payloads parse with the same default. Existing RLS applies.
- Restaurant reads use a new public cache key so previously parsed objects cannot hide the new property. Recipe JSON and `upsert_recipe` are unchanged.
- The form order and main navigation entry point intentionally change. Existing Roll routes remain available; gallery routes remain in navigation. No restaurant slugs were changed for this request.
- The theme consolidation intentionally normalizes some spacing, tiny typography and input radii. Cascade order was preserved, and affected layouts were checked in both themes.
- Yelp image optimization can fail when the source is unavailable; the native original and neutral placeholder are deliberate fallbacks. Other HTTPS sources continue to load directly.

## Prioritized Recommendations

### P0 (Must Fix Before Push)

- None confirmed in the reviewed scope after remediation. No blocker is being waived on the basis of passing unit tests alone.

### P1 (Important, Should Be Scheduled)

- None outstanding for this release. The confirmed loading, polling, stale-role UI and editor/theme ownership issues described above were fixed and checked during this audit.

### P2 (Nice to Have)

- Add repeatable browser coverage for gallery selection/save/reload, import cancellation, status-step changes, and recipe dismissal. It would preserve the manually checked behavior in future releases.
- Measure native-device motion and field performance before promising animation smoothness or Core Web Vitals scores. Current checks show stable frames, not universal device results.
- Prune legacy CSS by screen with visual comparisons. Avoid a wholesale cascade rewrite alongside feature work.
- Revisit public collection payloads if measured bytes/hydration cost rise. Separate owner edit records from summary reads carefully, so partial data can never overwrite full restaurant records.

## Task Backlog

- `Priority`: P2
  - `Task`: Capture critical browser flows in CI.
  - `Rationale`: Current business/permission coverage is strong, but manual browser checks do not automatically catch future focus, route-transition or persistence regressions.
  - `Evidence`: `.github/workflows/ci.yml`; `src/lib/restaurantEditor.test.ts`; `src/hooks/useRecipePanel.ts`; `src/components/restaurants/RestaurantEditor.tsx`.
- `Priority`: P2
  - `Task`: Profile on physical iOS/Android and collect field performance.
  - `Rationale`: One image comparison and desktop browser checks cannot establish all-device animation quality or real-user rendering metrics.
  - `Evidence`: `src/theme/motion.css`; `src/theme/media.ts`; `src/components/restaurants/RestaurantPhoto.tsx`.
- `Priority`: P2
  - `Task`: Remove legacy CSS incrementally with visual checks.
  - `Rationale`: Ordered extraction deliberately retained cascade compatibility. Pruning can reduce future selector ambiguity once each affected screen is verified.
  - `Evidence`: `src/styles.css`; `src/theme/restaurants.css`; `src/theme/responsive.css`; `src/theme/STYLE_GUIDE.md`.
- `Priority`: P2
  - `Task`: Reassess collection payload design after measured growth.
  - `Rationale`: Full-record reads simplify correctness at the current size. Any later summary/detail split must keep full owner mutation inputs separate.
  - `Evidence`: `src/lib/publicRestaurants.ts`; `src/hooks/RestaurantProvider.tsx`; `src/hooks/RecipeProvider.tsx`.

## Confidence & Unknowns

- Required checks: TypeScript, ESLint/theme guard, Vitest (211 tests across 22 files), production build, and Prettier. Dependency audit reports zero known vulnerabilities at the time of this audit; this does not exclude undisclosed vulnerabilities.
- Thumbnail database migration and anonymous/friend/owner permission assertions ran against Supabase; test writes rolled back. No production restaurant cover was arbitrarily changed for testing.
- Browser checks covered mobile and desktop, light/dark, restaurant list/map/search, gallery cover selection and reload persistence, fixed wizard height, navigation/Roll suggestions, recipe dialog dismissal, kitchen references and both share-image routes.
- Production verification passed at `https://www.grdn.recipes`: collection/Gallery/Roll routes returned 200, the dice action linked to Roll, optimized media returned WebP, both share-image routes returned 1200×630 PNGs, and unauthenticated Yelp/TikTok import requests returned 401. The live isolated demo also retained the selected cover after saving and reloading.
- Local wizard height stayed approximately 742.7px across the observed mobile step change. The default gallery order stayed stable when selecting another thumbnail.
- Reduced-motion paths were reviewed in code; physical-device accessibility settings and native momentum scrolling were not exhaustively tested. No paid Bright Data jobs were started during this audit; provider behavior is covered by mocked response tests and the earlier successful real imports.
- The snapshot is an initial tracked-file baseline, not a current complexity score. Long-file/duplicate heuristics were manually interpreted and were not counted as bugs.

## Recommended Next Steps (Ordered)

1. Keep the validated release and already-applied thumbnail migration together. Deployment and live collection/import/media verification are complete.
2. Use the gallery picker for actual cover curation. New imports retain the chosen cover unless it is explicitly removed.
3. Keep the theme guard in CI and follow the style guide for future edits.
4. Schedule the small P2 backlog as the app's usage and collection grow; avoid a speculative rewrite.
