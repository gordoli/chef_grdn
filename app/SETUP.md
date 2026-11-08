# Setup and deployment

## This project is already initialized

The supplied Supabase project has all four migrations applied, eight seeded recipes (five Mains, three Soups), private photo buckets with explicit public recipe-photo reads, and Gordon’s owner profile. The original Lasagna Soup source photo is uploaded and attributed. No invitation email was sent during setup.

The local `app/.env.local` contains the provided credentials and is ignored by Git. It is not required or appropriate to copy the service-role key or database password to the browser or Vercel.

## Vercel

1. Import `gordoli/chef_grdn` into Vercel. Framework: **Vite**. Root Directory: **`app`**. Node: **24.x**.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your local file for Production and Preview. The publishable key belongs in the latter variable.
3. Deploy. `vercel.json` builds `dist`, serves SPA routes, and leaves `/api/import` and `/api/import-image` as server functions.
4. `VITE_SITE_URL` may specify a custom production origin for social metadata. Otherwise the build uses `VERCEL_PROJECT_PRODUCTION_URL`. Never set it to a URL with a trailing slash.

## Finish Supabase email configuration

In your Supabase dashboard:

1. **Authentication → URL Configuration:** set Site URL to the deployed production origin. Add `https://<your-production-domain>/**` and `http://localhost:5173/**` to Redirect URLs. Add trusted preview origins explicitly if you need editing there.
2. **Authentication → Sign In / Providers → Email:** keep email enabled, turn off “Allow new users to sign up.” The app already passes `shouldCreateUser: false`.
3. Visit the site, choose Add (or the account icon), and request your magic sign-in link with your owner email. The collection and gallery are public; editing/importing require your owner session.
4. To invite reviewers, use **Authentication → Users → Invite user**. They are friends by default. Do not give them the owner role.

Email delivery and production redirect configuration need a live sign-in check after deployment. No email delivery is assumed from a database-only test.

## Local development

```sh
cd app
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite provides the same authenticated import handlers as Vercel. `npm run preview` serves the built static UI; the import API requires Vite dev or Vercel.

## A fresh Supabase project

1. Copy `.env.example` to `.env.local`; fill only the requested values locally.
2. Run SQL files in `supabase/migrations` in numeric order with the SQL editor or Supabase CLI. The schema is intended to run once, not repeatedly.
3. Create/invite the owner, then promote their profile in SQL using the correct user ID:
   `update public.profiles set role = 'owner' where id = '<owner-auth-user-id>';`
4. Seed with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the shell environment: `npm run seed`. It is idempotent by slug; it does not delete extra recipes or photos.
5. Complete the email configuration above.

## Install and maintain

On desktop Chrome use Install app; on iOS Safari use Share → Add to Home Screen. PNG icons and the manifest are generated for installation. Add photos from a recipe’s editor; use arrow controls or drag to reorder. Position zero becomes the cover. Gallery shows every saved recipe photo.

Regenerate brand sizes and social preview with `npm run brand` after replacing `public/brand/chef-grdn-mascot.png`. The original full-resolution portrait is intentionally excluded from Git.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:api
npm run build
npm run format:check
```

See `docs/verification.md` for the exact automated, browser and live database checks performed.
