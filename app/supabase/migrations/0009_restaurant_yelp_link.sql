-- Keep the restaurant's own website independent from its Yelp listing.
alter table public.restaurants add column if not exists yelp_url text
  check (yelp_url is null or (length(yelp_url) <= 2048 and yelp_url ~ '^https://(www\.)?yelp\.com/biz/[^/?#]+/?$'));
update public.restaurants set yelp_url = yelp_data->0->>'url'
where yelp_url is null and jsonb_array_length(yelp_data) > 0;
comment on column public.restaurants.yelp_url is 'Primary Yelp listing; website remains the restaurant website. Per-branch Yelp provenance remains in yelp_data.';
notify pgrst, 'reload schema';
