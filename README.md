# Chef GRDN

Gordon’s personal recipe portfolio: a minimal, responsive recipe book with Poppins, light/dark themes, a shared shadcn-style component library, and Supabase persistence.

The application lives in **`app/`**. Set **Root Directory = `app`** when importing this repository into Vercel.

```sh
cd app
npm ci
cp .env.example .env.local # the configured local file already exists on Gordon’s machine
npm run dev
```

See [setup and deployment](app/SETUP.md), [architecture](app/ARCHITECTURE.md), and [verification](app/docs/verification.md).

## Included

- Public recipe collection with title/ingredient search, type filters, sorting, grid/list views, and recipe permalinks.
- Local favorites for visitors; account favorites sync through Supabase.
- Owner-only manual recipe editing, supported-website import, source-image import, and photo uploads/reordering.
- Ingredient scaling with fractions/ranges, ingredient checklist, original sources, and kitchen notes.
- Photo gallery and an on-demand Instagram public profile embed with a direct profile fallback.
- Optional invited-friend reviews with ratings and photos.
- Installable PWA, custom pixel chef identity, and social preview artwork.
- Original eight recipes and compatible `upsert_recipe` contract.

No real credentials are tracked. Production needs only the public Supabase URL and publishable key; server import endpoints validate the caller’s own access token and database role.
