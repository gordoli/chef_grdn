-- Takeout is an owner-curated attribute, independent of visit status and favorites.
alter table public.restaurants add column if not exists is_takeout boolean not null default false;
comment on column public.restaurants.is_takeout is 'Owner-marked regular takeout/delivery restaurant. Existing restaurant RLS applies.';
notify pgrst, 'reload schema';
