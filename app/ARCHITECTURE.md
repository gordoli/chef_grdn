# Architecture

Vite + React 18 + strict TypeScript. Tailwind 4 supplies utilities; theme variables and component classes in `src/styles.css` define the visual language. Poppins is the single family. There is no framework-specific server rendering dependency.

## Boundaries

- `components/ui`: locally owned shadcn-style Button, Input/Textarea, and Radix Dialog primitives. `cn` combines variants and merges utility classes. Domain components reuse these accessible primitives.
- `pages`: collection, editor, gallery, recipe sheet, and magic-link sign-in. Large route modules load on demand.
- `hooks/RecipeProvider.tsx`: recipe queries/mutations and preview persistence. `useRecipes.ts` holds the context contract/hook; presentation does not query the database directly.
- `hooks/SessionProvider.tsx`: session lifecycle and editing gate; browsing does not require a session. Profiles and RLS enforce owner access. Session and recipe refreshes guard stale responses.
- `lib/quantity.ts`, `recipeText.ts`: pure parsing, scaling, formatting, and editor round trips. Raw ingredient strings remain authoritative at factor 1.
- `lib/photos.ts`: EXIF-aware client resizing, uploads and batched expiring signed URL cache. Stored photos retain captions, order and cover identity.
- `server`: bounded recipe HTML/JSON-LD and binary image import; curated publisher/CDN allowlists, validated redirects, MIME/signature checks, timeouts, per-owner in-memory quotas. All URLs are untrusted. No browser CORS proxy.
- `api`: Vercel Node HTTP adapters. Each verifies the session with Supabase and verifies `profiles.role = owner` before invoking import services. Only the public key is required on the server.
- `supabase/migrations`: schema, RLS, public portfolio reads, favorites and owner photo cleanup. `upsert_recipe` remains service-role-only and keeps its original JSON contract.

## Data and access

Anonymous visitors read recipes and recipe photos; Storage buckets remain private with explicit recipe-photo read policies. Review photos, profiles and reviews are visible only to signed-in users. Anonymous favorites stay in localStorage. Authenticated favorites are scoped by `auth.uid()`. Every recipe/photo mutation is owner-only under RLS. Invitees may write only their own reviews. Users may update their display name, never their role.

`/demo` is an explicitly labeled, isolated browser-only copy of the eight seed recipes. It cannot write to Supabase or invoke import APIs. Preview edits and favorites use distinct storage keys.

The PWA caches only the app shell/assets, not Supabase API records or signed photo data. Updates wait for user action to avoid reloading an unfinished recipe editor.

## Intentional limits

Website scraping depends on publishers allowing requests and providing structured data. Unsupported sites and social video posts use the manual editor. The Instagram public profile embed is controlled by Instagram and has a direct link fallback; it is not a token-backed automatically refreshed media feed. Source images retain attribution. In-memory import quotas are best effort per function instance, suitable for a single-owner portfolio, not a shared abuse-prevention service.

No meal planner, grocery list, nutrition system or additional infrastructure is introduced.
