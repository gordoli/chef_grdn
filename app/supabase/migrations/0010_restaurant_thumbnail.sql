-- A chosen gallery image survives later imports; null preserves the automatic first-photo default.
alter table public.restaurants add column if not exists thumbnail_url text
  check (thumbnail_url is null or (length(thumbnail_url) <= 2048 and thumbnail_url ~ '^https://[^[:space:]]+$'));
comment on column public.restaurants.thumbnail_url is 'Owner-selected restaurant cover/thumbnail URL; null uses the first available gallery photo. Existing restaurant RLS applies.';
notify pgrst, 'reload schema';
