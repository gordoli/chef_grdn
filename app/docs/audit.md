# Chef GRDN audit

Reviewed November 8, 2026. Scope: recipe browsing, search, favorites, owner editing, photos, reviews, import APIs, and Supabase authorization. This records completed checks and their limits; it is not a claim that every acceptance criterion has been exercised in a browser.

## Verification performed

The full automated run completed with **108 passing tests across four files**:

| Suite                    | Tests | Coverage                                                                                                                                             |
| ------------------------ | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quantity and recipe text |    41 | Required scaling examples, ranges, fractions, parenthetical amounts, invalid factors, all seed ingredient/method round trips                         |
| Import authorization     |     7 | Missing/expired sessions, verified owner role, friend rejection, missing profiles, authentication failures                                           |
| Recipe importing         |    28 | Structured recipe data, metadata fallback, publisher notes, URL allowlist, redirects, response limits, timeouts, request validation, per-user limits |
| Source image importing   |    32 | Allowed publishers/CDNs, redirect validation, file signatures, content types, download limits, timeouts, per-user limits                             |

Typecheck passed during the full audit. The earlier lint run had no errors and three warnings; provider/hook exports and refresh lifecycle code have since been separated or revised. Final lint, build, and dependency checks belong to the final delivery run because dependencies were subsequently upgraded to Vite 8, Vitest 5, and React Router 7. The production dependency audit after those upgrades reported **zero vulnerabilities**.

## Live database checks

Migrations `0001`–`0004` were applied. Seeding twice produced exactly eight recipes with eight unique slugs: five Mains and three Soups.

Authorization was exercised against the real database using disposable users inside a single `BEGIN`/`ROLLBACK` transaction:

- **Friend:** could read recipes, update their own display name, and create/update/delete their own review. Recipe edits matched zero rows. Changing their role was denied. Inserting a review attributed to another user was denied; updating/deleting another user's review matched zero rows. Favorites were isolated by user.
- **Owner:** could edit a recipe and delete another author's review.
- **Anonymous visitor:** could read all eight portfolio recipes. Recipe insertion was denied and updates matched zero rows. Profiles and friend reviews remained unreadable.
- **Cleanup:** rollback left zero disposable audit users and the original eight recipes.

All five application tables have RLS enabled. The photo buckets remain non-public buckets; migration `0004` deliberately grants anonymous read access to recipe photo metadata and objects for the public portfolio. Review photos remain restricted to signed-in users. The owner cleanup policy allows deletion of photos attached to reviews being moderated.

Verified separately: anonymous and authenticated browser roles cannot execute `upsert_recipe`; the service role can. Authenticated users can update `profiles.display_name` but cannot update `profiles.role`.

## Findings resolved

- Revoked table-level profile UPDATE before granting only `display_name`, preventing role escalation that a column revoke alone would not prevent.
- Replaced stale photo reorder closures with an explicit complete-order action. Cover selection now follows the first photo; removal reassigns the cover and normalizes remaining positions. New uploads append after the highest existing position.
- Guarded asynchronous refreshes so older requests cannot overwrite newer recipe/session results.
- Preserved newly saved recipes when adding photos through the preview flow; delayed editor mounting until recipe data loads.
- Added pending guards for favorite mutations and changed failure rollback to affect only the requested recipe.
- Added owner authorization, exact outbound host allowlists, redirect revalidation, size/time limits, and verified-user request limits to importing.
- Kept public portfolio reads separate from owner-only recipe writes and private friend review/profile data.

## Practical limits and follow-up verification

- The 108 tests are unit/service tests, not a complete component interaction or end-to-end browser suite. Mobile layout, theme switching, accessible dialogs, photo drag/reorder, and installed-PWA behavior require the separate browser/device checks.
- RLS assertions ran directly against PostgreSQL with role/JWT claims. They prove database policy behavior; they do not replace a complete magic-link sign-in and friend photo-upload session.
- Importing supports explicitly allowed recipe publishers/CDNs. Upstream blocking, missing structured recipe data, and unsupported social posts can require manual entry. Imported content is editable before saving.
- Instagram rendering depends on the public profile's embed availability and browser restrictions. The profile link remains the fallback; no authenticated Instagram grid synchronization is configured.
- Storage cleanup and database metadata changes cross separate APIs, so partial network failures can require retry. Request limiting is process-local; a distributed limiter is appropriate if importing is later exposed to a larger audience.
- No real invitation/sign-in emails were sent by the audit. No permanent test accounts, reviews, favorites, or recipe changes were retained.

The identified authorization and photo-ordering blockers were corrected. Final release sign-off should use the current lint/typecheck/test/build results and the separately recorded browser verification, rather than treating this report as blanket acceptance approval.
