# Chef GRDN development

The app is in `app/`. Read `app/ARCHITECTURE.md` before editing. The original handoff in `app/reference/artifact.html` is historical reference; the user’s current requirements take precedence: public portfolio browsing, Poppins, Tailwind/shadcn, light/dark themes, Supabase, and Vercel.

Use the shared primitives in `app/src/components/ui` and theme tokens in `app/src/styles.css`. Keep HTTP/import concerns in `app/server`, persistence and state in hooks, pure quantity/text functions in `app/src/lib`, and view composition in pages/components. Validate external inputs. Preserve recipe JSON shapes and `upsert_recipe`.

From `app/`: run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run format:check` before delivery. Test meaningful business logic and permission boundaries. Avoid speculative abstractions. Never commit `.env.local`, tokens, database passwords, or the original portrait reference.
