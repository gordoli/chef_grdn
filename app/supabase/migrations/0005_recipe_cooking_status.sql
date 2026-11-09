-- Keep the existing portfolio visible; newly added recipes start on the try list.
alter table public.recipes
  add column cooking_status text not null default 'made'
  check (cooking_status in ('made', 'to_try'));

alter table public.recipes alter column cooking_status set default 'to_try';

-- Existing owner-only recipe RLS also protects this field. upsert_recipe keeps
-- its JSON contract: inserts use the default, updates preserve the saved status.
