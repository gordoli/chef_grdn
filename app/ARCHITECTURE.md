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

Liquid-glass styling uses one shared `.glass-control` material for navigation and floating controls: neutral translucent fills, backdrop blur, edge highlights and inset/ambient shadows. Content surfaces stay black/white. Green is reserved for primary actions and meaningful ingredient states. Reduced-motion and reduced-transparency preferences have fallbacks.

## Intentional limits

`/basics` and `/demo/basics` share a public kitchen reference with linked primary sources. Culinary steak doneness is distinguished from USDA minimum cooking temperatures. The converter uses US customary volume and avoirdupois weight; it never infers ingredient density. Favorites are a filter on Recipes; the former favorites URLs remain compatible. Mobile recipes always use the compact list presentation while desktop layout preferences remain independent.

The default collection groups recipes by type: Mains, Appetizers, Soups, then the remaining categories. `lib/recipeCollection.ts` owns display names, ordering, and grouping; existing Starter/Appetizer aliases are grouped together without rewriting saved records. Search and favorites omit empty sections. Alternate sorts remain flat.

Website scraping depends on publishers allowing requests and providing structured data. Unsupported sites and social video posts use the manual editor. The Instagram public profile embed is controlled by Instagram and has a direct link fallback; it is not a token-backed automatically refreshed media feed. Source images retain attribution. In-memory import quotas are best effort per function instance, suitable for a single-owner portfolio, not a shared abuse-prevention service.

No meal planner, grocery list, nutrition system or additional infrastructure is introduced.
