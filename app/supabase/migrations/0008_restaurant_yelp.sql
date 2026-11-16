-- External business information stays separate from personal ratings, notes and friend reviews.
alter table public.restaurants add column if not exists yelp_data jsonb not null default '[]'::jsonb
  check (jsonb_typeof(yelp_data) = 'array' and jsonb_array_length(yelp_data) <= 12 and octet_length(yelp_data::text) <= 600000);
comment on column public.restaurants.yelp_data is 'Yelp business information collected through Bright Data, with source URLs, photo credits and retrieval dates. Existing owner-only write RLS applies.';
notify pgrst, 'reload schema';
