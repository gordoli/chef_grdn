-- Restaurants are a public portfolio; only the existing owner may change it.
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  name text not null check (length(trim(name)) between 1 and 200),
  cuisine text not null default '' check (length(cuisine) <= 100),
  neighborhood text check (length(neighborhood) <= 150),
  status text not null default 'want_to_go' check (status in ('visited', 'want_to_go')),
  is_favorite boolean not null default false,
  price_range text check (price_range ~ '^[$]?[0-9]+([.][0-9]{1,2})? *[-–] *[$]?[0-9]+([.][0-9]{1,2})?$'),
  visited_on date,
  rating numeric check (rating between 0 and 5 and mod(rating, 0.5) = 0),
  companions text[] not null default '{}' check (cardinality(companions) <= 30),
  notes text not null default '' check (length(notes) <= 10000),
  website text check (website ~ '^https://' and length(website) <= 2048),
  address text check (length(address) <= 500),
  phone text check (length(phone) <= 80),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  photo_urls text[] not null default '{}' check (cardinality(photo_urls) <= 12),
  video_urls text[] not null default '{}' check (cardinality(video_urls) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'visited' or (visited_on is null and rating is null)),
  check ((latitude is null) = (longitude is null))
);
alter table public.restaurants enable row level security;
grant select on public.restaurants to anon, authenticated;
grant insert, update, delete on public.restaurants to authenticated;
create policy "public restaurants" on public.restaurants for select to anon, authenticated using (true);
create policy "owner adds restaurants" on public.restaurants for insert to authenticated with check (public.is_owner());
create policy "owner edits restaurants" on public.restaurants for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes restaurants" on public.restaurants for delete to authenticated using (public.is_owner());
create function public.touch_restaurant() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger touch_restaurant before update on public.restaurants for each row execute function public.touch_restaurant();

-- Friend reviews remain authenticated, matching recipe review privacy.
create table public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  rating numeric not null check (rating between 0 and 5 and mod(rating, 0.5) = 0),
  body text not null default '' check (length(body) <= 5000),
  visited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, author_id)
);
alter table public.restaurant_reviews enable row level security;
revoke all on public.restaurant_reviews from anon;
grant select, insert, update, delete on public.restaurant_reviews to authenticated;
create policy "signed in reads restaurant reviews" on public.restaurant_reviews for select to authenticated using (true);
create policy "writes own restaurant review" on public.restaurant_reviews for insert to authenticated with check (author_id = auth.uid());
create policy "edits own restaurant review" on public.restaurant_reviews for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "deletes own restaurant review" on public.restaurant_reviews for delete to authenticated using (author_id = auth.uid() or public.is_owner());
create trigger touch_restaurant_review before update on public.restaurant_reviews for each row execute function public.touch_restaurant();
