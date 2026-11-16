# Architecture

Next.js 16 App Router + React 19 + strict TypeScript. Tailwind 4 supplies utilities; theme variables and component classes in `src/styles.css` define the visual language. Poppins is the single family. Public recipes render on the server and refresh in the browser. Fonts are served locally through next/font.

## Boundaries

- `components/ui`: locally owned shadcn-style Button, Input/Textarea, and Radix Dialog primitives. `cn` combines variants and merges utility classes. Domain components reuse these accessible primitives.
- `src/app`: native Next.js pages, layouts, metadata, manifest, and API Route Handlers.
- `views`: client-side collection, editor, gallery, recipe sheet, and email/password sign-in and password recovery.
- `lib/publicRecipes.ts`: cached, anonymous-only Supabase reads for the server-rendered collection. No private profiles, reviews or sessions enter this cache.
- `hooks/RecipeProvider.tsx`: recipe queries/mutations and preview persistence. `useRecipes.ts` holds the context contract/hook; presentation does not query the database directly.
- `hooks/SessionProvider.tsx`: session lifecycle and editing gate; browsing does not require a session. Profiles and RLS enforce owner access. Session and recipe refreshes guard stale responses.
- `lib/quantity.ts`, `recipeText.ts`: pure parsing, scaling, formatting, and editor round trips. Raw ingredient strings remain authoritative at factor 1.
- `lib/photos.ts`: EXIF-aware client resizing, uploads and batched expiring signed URL cache. Stored photos retain captions, order and cover identity.
- `server`: bounded recipe HTML/JSON-LD and binary image import; curated publisher/CDN allowlists, validated redirects, MIME/signature checks, timeouts, per-owner in-memory quotas. All URLs are untrusted. No browser CORS proxy.
- `src/app/api`: Next.js Route Handlers. Each verifies the session with Supabase and verifies `profiles.role = owner` before invoking import services. Only the public key is required on the server.
- `supabase/migrations`: schema, RLS, public portfolio reads, favorites and owner photo cleanup. `upsert_recipe` remains service-role-only and keeps its original JSON contract.

## Data and access

Anonymous visitors read recipes and recipe photos; Storage buckets remain private with explicit recipe-photo read policies. Review photos, profiles and reviews are visible only to signed-in users. Anonymous favorites stay in localStorage. Authenticated favorites are scoped by `auth.uid()`. Every recipe/photo mutation is owner-only under RLS. Recipe cooking status (`made` / `to_try`) is shared across the book and owner-editable. Existing recipes and legacy preview JSON count as made; new recipes default to to-try. The Recipes page starts with made recipes, and its status filter composes with favorites, category and search. Status changes use a separate mutation so editor saves and `upsert_recipe` preserve them. Invitees may write only their own reviews. Users may update their display name, never their role.

`/demo` is an explicitly labeled, isolated browser-only copy of the eight seed recipes. It cannot write to Supabase or invoke import APIs. Preview edits and favorites use distinct storage keys.

The installable manifest keeps the existing pixel-chef icons. The service worker retires the previous Vite app-shell cache; it does not cache Supabase records, signed photos or Next.js navigation responses. Next.js owns page and asset delivery.

Recipe pages publish their own title, canonical URL and Open Graph/Twitter preview. `/r/[slug]/share-image` renders a square cover photo beside the recipe title using local Poppins and pixel-chef assets; without a photo, the text uses the full width and aligns left. Only anonymous portfolio data and bounded, validated recipe-photo storage images enter previews. Image URLs include the preview layout version, recipe revision and cover ID, so edits get a fresh URL. Metadata is included in the initial HTML head for messaging clients. Empty or generic filler introductions are omitted from the recipe sheet.

Copy recipe link includes the same revision in a `share` query parameter, while canonical URLs stay clean. This gives messaging clients a fresh page URL after edits instead of repeatedly using an earlier icon-only preview; existing messages remain controlled by the messaging app's cache. Portion parameters are preserved.

Liquid-glass styling uses one shared `.glass-control` material for navigation and floating controls: neutral translucent fills, backdrop blur, edge highlights and inset/ambient shadows. Content surfaces stay black/white. Green is reserved for primary actions and meaningful ingredient states. Reduced-motion and reduced-transparency preferences have fallbacks.

The header exposes Search, Kitchen basics, and Settings in that order. Settings contains theme and account actions; Basics is outside the main navigation. Layout owns shared collection search state so the header can reveal and focus the collection search, including from another page. In the Restaurants section, the header search targets restaurants and their locations instead. Search closes on outside clicks, its toggle, or Escape; hidden controls are inert. Category filters stay in a horizontally scrolling row.

Recipe details keep Radix dialog focus and keyboard behavior while presenting a sliding page with a back chevron. `useRecipePanel` coordinates entry/exit, navigation after closing, and rightward pointer gestures; `recipeSwipe` classifies deliberate swipes. Vertical scrolling, interactive controls, photo strips, nested dialogs, and mouse text selection are excluded from dismissal. Reduced motion skips the transition.

## Intentional limits

`/basics` and `/demo/basics` share a public kitchen reference with linked primary sources. Conversions opens first; headings stay brief and practical. Culinary steak doneness is distinguished from USDA minimum cooking temperatures. The converter uses US customary volume and avoirdupois weight; it never infers ingredient density. Favorites are a filter on Recipes; the former favorites URLs remain compatible. Mobile recipes always use the compact list presentation while desktop layout preferences remain independent.

The default collection groups recipes by type: Mains, Appetizers, Soups, then the remaining categories. `lib/recipeCollection.ts` owns display names, ordering, and grouping; existing Starter/Appetizer aliases are grouped together without rewriting saved records. Search and favorites omit empty sections. Alternate sorts remain flat.

Website scraping depends on publishers allowing requests and providing structured data. Unsupported sites and social video posts use the manual editor. The Instagram public profile embed is controlled by Instagram and has a direct link fallback; it is not a token-backed automatically refreshed media feed. Source images retain attribution. In-memory import quotas are best effort per function instance, suitable for a single-owner portfolio, not a shared abuse-prevention service.

No meal planner, grocery list, nutrition system or additional infrastructure is introduced.

## Restaurants

`/restaurants` is a public restaurant collection with list/map views and three independent tabs (Been to, Want to go, Favorites), and individual `/restaurants/[slug]` pages. Cards show saved thumbnails with an owner-editable favorite heart, cuisine, neighborhoods beneath the name, the owner's rating, and a numeric price range per person. The owner edits the collection, personal notes/rating, visit date, and dining companions. These owner-authored fields are public portfolio data. Friend reviews live in `restaurant_reviews`; they are authenticated-only and scoped to their author for writes, with owner moderation for deletion. RLS and constraints are defined in migration 0006. Migration 0007 adds bounded JSON locations (neighborhood, address, phone, latitude/longitude) and merges Dumpling Story while preserving reviews and personal fields. Legacy scalar location fields remain compatible; location arrays drive cards, search, details, map pins and share previews. Previous Dumpling Story URLs redirect to its canonical page. Cuisine filtering uses the shared shadcn/Radix Select primitive; there is no collection-order control. Recipe JSON and `upsert_recipe` are unchanged.

`hooks/RestaurantProvider.tsx` owns persistence, session-sensitive review reads, mutations, and stale-request guards. `lib/restaurants.ts` validates inputs and derives safe social embed links. Anonymous server reads are request-local and shared by metadata/pages, so a revisioned restaurant share link immediately reflects edits. The custom share-image route uses local Poppins/mascot assets and a bounded, validated website image, with a text-only fallback. Messaging metadata renders in the initial head, as with recipes. A preview image revision changes with `updated_at`.

`server/restaurantImport.ts` extracts restaurant JSON-LD and website photos for owner review before saving. `restaurantFetch.ts` validates public HTTPS URLs, resolves and rejects non-public DNS addresses on every redirect, and pins the validated address to the TLS connection. HTML/images have byte and time limits; images used in share cards are decoded with pixel bounds. Website ratings never become the owner's rating. Dollar-sign price tiers are left blank rather than converted to invented numeric prices. `restaurantGeocode.ts` optionally resolves a single unambiguous US business address through the fixed-origin Census API. Map rendering uses lazy-loaded Leaflet and attributed OpenStreetMap tiles; unconfirmed locations have direct map-search links. No map key is required.

Instagram posts/reels and full TikTok video links are stored as URLs, not arbitrary HTML. The Videos tab derives fixed-provider iframe URLs and always offers a direct link; private, removed, or platform-restricted posts may not embed. `/demo/restaurants` uses a separate localStorage copy and cannot invoke import APIs or write reviews/database rows. `seed/restaurants.json` contains 26 places (one Dumpling Story with Mission/Pacific Heights locations, Amarin in Lafayette, and the requested removal of La Taq/El Faro), with the five requested places marked want-to-go. Personal ratings and visit dates remain unset. Reported numeric price ranges and their research provenance are recorded in `seed/restaurant-pricing-sources.json`; missing reliable ranges and uncertain chain branches stay blank. Owner-supplied image links are saved first in their galleries. `npm run seed:restaurants` inserts missing slugs without overwriting existing entries.
